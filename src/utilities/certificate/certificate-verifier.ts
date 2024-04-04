import jsigs from 'jsonld-signatures';
import {contexts} from 'security-context';
import documentLoaders from 'jsonld';
import {credentialsv1} from './credentials';
import { CsHttpRequestType, CsHttpService, CsRequest } from '../../core/http-service/interface';
import { catchError, map } from "rxjs/operators";
import { InjectionTokens } from '../../injection-tokens';
import { Container } from 'inversify';

const CERTIFICATE_CONTROLLER_ID =  'https://sunbird.org/';
const CERTIFICATE_DID =  'did:india';
export class CertificateVerifier {
    get host(): string {
        return this.container.get(InjectionTokens.core.api.HOST);
    }
    constructor(
        private httpService: CsHttpService,
        private container: Container

    ) {
        
    }

    private publicKey = '';

    public async verifyData(signedJSON, publicKey): Promise<any>{
        this.publicKey = publicKey;
        try {
            const {AssertionProofPurpose} = jsigs.purposes;
            let result;
            const publicKey = {
                '@context': jsigs.SECURITY_CONTEXT_URL,
                id: CERTIFICATE_DID,
                type: 'Ed25519VerificationKey2020', // Changed to use Ed25519VerificationKey2020
                controller: CERTIFICATE_CONTROLLER_ID,
                publicKeyBase58: this.publicKey // Assuming the publicKey is in Base58 format
            };
            const controller = {
                '@context': jsigs.SECURITY_CONTEXT_URL,
                id: CERTIFICATE_CONTROLLER_ID,
                publicKey: [publicKey],
                // this authorizes this key to be used for making assertions
                assertionMethod: [publicKey.id]
            };
            const suite = new jsigs.suites.Ed25519Signature2020({});

            result = await jsigs.verify(signedJSON, {
                suite,
                purpose: new AssertionProofPurpose({controller}),
                documentLoader: this.customLoader,
                compactProof: false
            });
            result.certificateData = {
                issuedTo: signedJSON.credentialSubject.recipientName,
                issuanceDate: signedJSON.issuanceDate,
                issuerName: signedJSON.issuer.name,
                trainingName: signedJSON.credentialSubject.trainingName,
                trainigId: signedJSON.credentialSubject.trainingId
            };
            return result;
            
        } catch (e) {
            throw new Error('Invalid data');
        }
    }
    
    public customLoader = async url => {
        const c = {
            "did:india": this.publicKey,
            "https://example.com/i/india": this.publicKey,
            "https://w3id.org/security/v1": contexts.get("https://w3id.org/security/v1"),
            'https://www.w3.org/2018/credentials#': credentialsv1,
            "https://www.w3.org/2018/credentials/v1": credentialsv1
            
        };
        let context = c[url];
        if (context === undefined) {
            context = contexts[url];
        }
        if (context !== undefined) {
            const c = {
                contextUrl: null,
                documentUrl: url,
                document: context
            };
            return c;
        }
        if (url.startsWith("{")) {
            return JSON.parse(url);
        }
        console.log('====> host ', this.host); // TODO: log!
        const apiRequest: CsRequest = new CsRequest.Builder()
            .withHost('https://')
            .withType(CsHttpRequestType.GET)
            .withPath(url.split('//')[1])
            .withBearerToken(false)
            .withHeaders({
                'Origin': this.host
            })
            .withUserToken(false)
            .build();
        console.log('====> apiRequest ', apiRequest); // TODO: log!
        const jsonResp = await this.httpService.fetch(apiRequest)
            .pipe(
                map((response) => {
                    return response.body;
                }),
                catchError(e => {
                    throw e;
                })
            ).toPromise();
            const c1 = {
                contextUrl: null,
                documentUrl: url,
                document: jsonResp
            };
            return c1; 
    };
  
}
