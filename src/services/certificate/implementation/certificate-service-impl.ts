import { Container, inject, injectable } from "inversify";
import { map, mergeMap } from "rxjs/operators";
import { CsLearnerCertificate, CsLearnerCertificateV1, CsLearnerCertificateV2 } from "src/models";
import { CSGetLearnerCerificateRequest } from "..";
import { defer, iif, Observable, of } from "rxjs";
import { CsCertificateServiceConfig } from '../../../index';
import { CsHttpRequestType, CsHttpService, CsRequest } from '../../../core/http-service/interface';
import { InjectionTokens } from '../../../injection-tokens';
import {
  CsCertificateService,
  GetPublicKeyRequest,
  GetPublicKeyResponse,
  DownloadCertificateResponse,
  DownloadCertificateRequest,
  CertificateType
} from "../interface";
import { CsSystemSettingsService } from "src/services/system-settings";

@injectable()
export class CertificateServiceImpl implements CsCertificateService {
  constructor(
    @inject(InjectionTokens.core.HTTP_SERVICE) private httpService: CsHttpService,
    @inject(InjectionTokens.services.certificate.CERTIFICATE_SERVICE_API_PATH) private apiPath: string,
    @inject(InjectionTokens.services.certificate.RC_API_PATH) private rcApiPath: string,
    @inject(InjectionTokens.services.systemSettings.SYSTEM_SETTINGS_SERVICE) private systemSettingsService: CsSystemSettingsService,
    @inject(InjectionTokens.CONTAINER) private container: Container
  ) {
  }

    fetchCertificatesV1(request: CSGetLearnerCerificateRequest, config?: CsCertificateServiceConfig): Observable<CsLearnerCertificateV1[]> {
        if (!this.apiPath && (!config || !config.apiPath)) {
            throw new Error('Required certificate api Path configuration');
        }

        let certRequest = {
            ...(request.size ? { size: request.size } : null),
            _source: [
              'data.badge.issuer.name',
              'pdfUrl',
              'data.issuedOn',
              'data.badge.name',
              'related.courseId',
              'related.Id'
            ],
            query: {
              bool: {
                must: [
                  {
                    match_phrase: {
                      'recipient.id': request.userId
                    }
                  }
                ]
              }
            }
          };

        const apiRequest: CsRequest = new CsRequest.Builder()
            .withType(CsHttpRequestType.POST)
            .withPath(`${config ? config.apiPath : this.apiPath}/certs/search`)
            .withBearerToken(true)
            .withUserToken(true)
            .withBody({
                request: certRequest
            })
            .build();

        return this.httpService.fetch<{ result: { response: { count: number, content: CsLearnerCertificateV1[] } } }>(apiRequest)
        .pipe(
            map((response) => {
            return response.body.result.response.content;
            })
        );
    }

    fetchCertificatesV2(request: CSGetLearnerCerificateRequest, config?: CsCertificateServiceConfig): Observable<CsLearnerCertificate[]> {
        if (!this.rcApiPath && (!config || !config.rcApiPath)) {
            throw new Error('Required certificate api Path configuration');
        }

        let certRequest = {
            filters:{
                contact:{
                    eq: request.userId
                }
            }
        };

        const apiRequest: CsRequest = new CsRequest.Builder()
            .withType(CsHttpRequestType.POST)
            .withPath(`${config ? config.rcApiPath : this.rcApiPath}/search`)
            .withBearerToken(true)
            .withUserToken(true)
            .withBody({
                request: certRequest
            })
            .build();

        return this.httpService.fetch<{ result: CsLearnerCertificateV2[] }>(apiRequest)
        .pipe(
            map((response) => {
            return response.body.result.map(r => {
                let result = {
                    id: r.training.id,
                    name: r.training.name,
                    issuerName: r.issuer.name,
                }
                return result;
            });
            })
        );
    }

    fetchcertificates(request: CSGetLearnerCerificateRequest): Observable<CsLearnerCertificate[]> {
        return this.fetchCertificatesV1(request).pipe(
            map((r) => r.map((rs) => {
                let result = {
                    id: rs._id,
                    courseId: rs._source.related.courseId,
                    name: rs._source.data.badge.name,
                    pdfUrl: rs._source.pdfUrl,
                    issuedOn: rs._source.data.issuedOn,
                    issuerName: rs._source.data.badge.issuer.name,
                }
                return result;
            })
            ),
            mergeMap((result) => {
                return this.fetchCertificatesV2(request).pipe(
                    map(r => [...result, ...r])
                )
            })  
        )
    }

  getPublicKey(request: GetPublicKeyRequest, config?: CsCertificateServiceConfig): Observable<GetPublicKeyResponse> {
    const apiRequest: CsRequest = new CsRequest.Builder()
      .withType(CsHttpRequestType.POST)
      .withPath((config ? config.apiPath : this.apiPath) + `/${request.signingKey}`)
      .withBearerToken(true)
      .withUserToken(true)
      .withBody({ request })
      .build();

    return this.httpService.fetch<{ result: { SigningKey: GetPublicKeyResponse } }>(apiRequest)
      .pipe(
        map((response) => {
          return response.body.result.SigningKey;
        })
      );
  }

  getCerificateDownloadURI(request: DownloadCertificateRequest, config?: CsCertificateServiceConfig): Observable<DownloadCertificateResponse> {
    return iif(
      () => (request.type === CertificateType.RC_CERTIFICATE_REGISTRY),
      defer(async () => {
        let schemaName = request.schemaName
        if (!schemaName) {
          try {
            schemaName = await this.systemSettingsService.getSystemSettings("certificate_schema").toPromise();
          } catch(e){
            throw new Error('Schema Name Not found');
          }
        }
        const certificateRegistryRequest: CsRequest = new CsRequest.Builder()
          .withType(CsHttpRequestType.GET)
          .withPath((config ? config.rcApiPath : this.rcApiPath)!!.replace("${schemaName}", schemaName) + '/download/' + request.certificateId)
          .withBearerToken(true)
          .withHeaders({
            'Accept': "image/svg+xml"
          })
          .build();
        return this.httpService.fetch<string>(certificateRegistryRequest).pipe(
          map((response) => {
            return {
              printUri: response.body
            };
          })
        ).toPromise();
      }),
      defer(() => {
        const rcCertficateRequest: CsRequest = new CsRequest.Builder()
          .withType(CsHttpRequestType.GET)
          .withPath((config ? config.apiPath : this.apiPath) + '/download/' + request.certificateId)
          .withBearerToken(true)
          .withUserToken(true)
          .build();
        return this.httpService.fetch<{ result: { printUri: string } }>(rcCertficateRequest).pipe(
          map((response) => {
            return response.body.result;
          })
        );
      })
    );
  }

}