import { CsFrameworkService, GetFrameworkOptions, FrameworkConfig } from '../interface';
import { FormParams, CsFormService } from '../../form/interface/cs-form-service';
import { inject, injectable } from 'inversify';
import { CsFormConfig, CsFrameworkConfig, CsFrameworkServiceConfig } from '../../../index';
import { config, Observable, of } from 'rxjs';
import { Framework, FrameworkCategory } from '../../../models/channel';
import { InjectionTokens } from '../../../injection-tokens';
import { CsHttpRequestType, CsHttpService, CsRequest } from '../../../core/http-service/interface';
import { catchError, map } from 'rxjs/operators';
import { CsFrameworkConfigBloc } from './cs-framework-config-bloc';

@injectable()
export class FrameworkServiceImpl implements CsFrameworkService {

    constructor(
        @inject(InjectionTokens.core.HTTP_SERVICE) private httpService: CsHttpService,
        @inject(InjectionTokens.services.framework.FRAMEWORK_SERVICE_API_PATH) private apiPath: string,
        @inject(InjectionTokens.services.form.FORM_SERVICE) private formService: CsFormService,
    ) {
    }

    getFramework(id: string, options?: GetFrameworkOptions, config?: CsFrameworkServiceConfig): Observable<Framework> {
        const apiRequest: CsRequest = new CsRequest.Builder()
            .withType(CsHttpRequestType.GET)
            .withPath((config ? config.apiPath : this.apiPath) + '/read/' + id)
            .withParameters({
                ...(options?.requiredCategories.length ? { categories: options.requiredCategories.join(',') } : {})
            })
            .withBearerToken(true)
            .build();

        return this.httpService.fetch<{ result: { framework: Framework } }>(apiRequest).pipe(
            map((response) => {
                return response.body.result.framework;
            })
        );
    }

    getFrameworkConfig(frameworkId: string, frameworkConfig?: CsFrameworkConfig, formConfig?: CsFormConfig): Observable<Array<FrameworkConfig> | Array<any>> {
        if(CsFrameworkConfigBloc.instance.config[frameworkId]){
            return of(CsFrameworkConfigBloc.instance.config[frameworkId])
        } else {
            if (frameworkConfig?.framework) {
                return of(this.transformCategoriesToConfig(frameworkConfig?.framework.categories!))
            } else if (formConfig?.params) {
                return this.formService.getForm(formConfig?.params, {apiPath: formConfig.apiPath}).pipe(
                    map((response) => {
                        return response.data.fields;
                    }),
                    catchError((e) => {
                        return this.transformFramework(frameworkId, frameworkConfig?.apiPath ?? "");
                
                    }))
            } else {
                return this.transformFramework(frameworkId, frameworkConfig?.apiPath ?? "");
            }
        }
    }

    getFrameworkConfigMap(frameworkId: string, frameworkConfig?: CsFrameworkConfig, formConfig?: CsFormConfig): Observable<{
        [frameworkId: string]: any;
      }> {
        return this.getFrameworkConfig(frameworkId, frameworkConfig, formConfig).pipe(
            map((response: Array<any>) => {
                return response.reduce((obj, item) => ({...obj, [item.identifier]: item}), {});
            })
        );
    }

    /** @internal */
    transformFramework(frameworkId: string, apiPath: string): Observable<FrameworkConfig[]> {
        return this.getFramework(frameworkId, {requiredCategories: []}, {apiPath: apiPath}).pipe(
            map((framework) => {
                return this.transformCategoriesToConfig(framework.categories!);
            })
        )
    }

     /** @internal */
     transformCategoriesToConfig(categories: FrameworkCategory[]): FrameworkConfig[] {
         
        return categories.map(({ index, code, name }) => ({ code: code, label: name, identifier: `fwCategory${index}`, index: index, placeHolder: `Select ${code}` }))
    }
}

