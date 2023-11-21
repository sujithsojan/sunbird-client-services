# @project-sunbird/client-services

## Table of Contents

1. [Overview](#overview)
1. [Installation](#installation)
1. [Getting Started](#getting-started)
   1. [Adapters](#adapters)
   1. [Update Configuration](#update-configuration)
1. [Services](#services)
   1. [CsGroupService](#csgroupservice)

## Overview

The library is grouped into Modules and SubModules as shown below -

```
@project-sunbird/client-services
├── blocs
    │   └── group-addable
    ├── core
    │   └── http-service
    ├── models
    │   ├── certificate
    │   ├── channel
    │   ├── content
    │   ├── course
    │   ├── device
    │   ├── faq
    │   ├── form
    │   ├── group
    │   ├── location
    │   ├── notification
    │   ├── organisation
    │   ├── page
    │   └── user
    ├── services
    │   ├── certificate
    │   ├── content
    │   ├── course
    │   ├── discussion
    │   ├── form
    │   ├── framework
    │   ├── group
    │   ├── location
    │   ├── notification
    │   ├── system-settings
    │   └── user
    ├── telemetry
    │   ├── errors
    │   ├── implementation
    │   └── interface
    └── utilities
        ├── aggregator
        └── certificate
```

The public facing API is prefixed with 'Cs' namespace, as in -
- CsModule
- CsConfig
- CsGroupService
- ...

For instance,
- CsModule is part of the root module
- CsContentsGroupGenerator is a utlility within content service

Their respective imports would be -

```
import {CsModule} from "@project-sunbird/client-services";
import {CsContentsGroupGenerator} from "@project-sunbird/client-services/services/content/utilities/content-group-generator";
```

## Installation

To install the package

```
npm i @project-sunbird/client-services@3.x.x
```

The package requires the consumer to have rxjs@6.x.x installed as the only peerDependency

## Getting Started

To use the library CsModule, it needs to be initialised with basic configuration.
CsModule is a singleton and it would be best to check if it has already been initialised before attempting to initialise -

```
if (!CsModule.instance.isInitialised) { // Singleton initialised or not
    await CsModule.instance.init({
        core: {
            httpAdapter: 'HttpClientBrowserAdapter', // optional - HttpClientBrowserAdapter or HttpClientCordovaAdapter, default - HttpClientBrowserAdapter 
            global: {
                channelId: 'some_channel_id', // required
                producerId: 'some_producer_id', // required
                deviceId: 'some_random_device_id' // required
            },
            api: {
                host: 'https://staging.ntp.net.in', // default host
                authentication: {
                    // userToken: string; // optional
                    // bearerToken: string; // optional
                }
            }
        },
        services: {
            // groupServiceConfig: CsGroupServiceConfig // optional
        }
    );
}
```

### Adapters

If the client for the library is a cordova project, use the 'HttpClientCordovaAdapter' adapter
or use 'HttpClientBrowserAdapter'. 'HttpClientBrowserAdapter' is the default if not specified.

### Update Configuration

The configuration can be dynamically reset after initialisation

```
const newConfig = {...CsModule.instance.config}; // copy existing config

newConfig.core.api.authentication = {
    bearerToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV.eyJpc3MiOiJzdGFnaW5nLmRpa3NoYS5hcHAtYTMzM2YzZjExZDM0YzlkNWYwZTE2MjUyYWMwZDVhYTZmMTBjYSIsImlhdCI6MTU4ODkxNDc1NX0.dEmjK6LStoenL_pRX1KwEtU4-opuUOUGI05ecex',
};

CsModule.instance.updateConfig(CsModule.instance.config);

// after login

newConfig.core.api.authentication = {
    userToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV.eyJpc3MiOiJzdGFnaW5nLmRpa3NoYS5hcHAtYTMzM2YzZjExZDM0YzlkNWYwZTE2MjUyYWMwZDVhYTZmMTBjYSIsImlhdCI6MTU4ODkxNDc1NX0.dEmjK6LStoenL_pRX1KwEtU4-opuUOUGI05ecex',
};

CsModule.instance.updateConfig(CsModule.instance.config);
```

### Accessing a service

The CsModule being a singleton, every service within would also be a singleton, To access any service - 

```
const httpService = CsModule.instance.httpService; // handles API calls, interceptors (tokens, logging)
const groupService = CsModule.instance.groupService; // internally uses httpService
```

## Services

Every service by default will utilise the optional configuration declared during init() or updateConfig()

```
CsModule.instance.init({
    ...
    services: {
        groupServiceConfig: { // optional
            apiPath: '/api/v1/group'
        }
    }
);
```

Additionally, methods of the service may have an optional argument that can override the global configuration explicitly
just for that method call

```
const group = await groupService.getById(
    group1.identifier,
    { apiPath: '/api/v2/group' } // optional
).toPromise();
```

### CsGroupService

This service deals with user group management and has the following interface -

```
CsModule.instance.init({
    ...
    services: {
        groupServiceConfig: { // optional
            apiPath: '/api/v1/group'
        }
    }
);

interface CsGroupService {
    create(
        name: string,
        board: string,
        medium: string | string[],
        gradeLevel: string | string[],
        subject: string | string[],
        config?: CsGroupServiceConfig
    ): Observable<Group>;

    deleteById(id: string, config?: CsGroupServiceConfig): Observable<void>;

    getAll(config?: CsGroupServiceConfig): Observable<Group[]>;

    getById(id: string, config?: CsGroupServiceConfig): Observable<Group>;

    addMemberById(memberId: string, groupId: string, config?: CsGroupServiceConfig): Observable<Group>;

    removeMemberById(memberId: string, groupId: string, config?: CsGroupServiceConfig): Observable<void>;
}
```

### CsFrameworkService

```
CsModule.instance.init({
    ...
    services: {
        frameworkServiceConfig: { // optional
            apiPath: '<path>'
        }
    }
);

export interface CsFrameworkService {
    getFramework(id: string, options?: GetFrameworkOptions, config?: CsFrameworkServiceConfig): Observable<Framework>;
}
```

### CsLocationService

```
CsModule.instance.init({
    ...
    services: {
        locationServiceConfig: { // optional
            apiPath: '<path>'
        }
    }
);

export interface CsLocationService {
    searchLocations(request?: SearchLocationRequests, config?: CsLocationServiceConfig): Observable<Location[]>;
}
```

### CsLocationService

```
CsModule.instance.init({
    ...
    services: {
        courseServiceConfig: { // optional
            apiPath: '<path>'
        }
    }
);

export interface CsCourseService {
    getUserEnrollmentList(request: GetUserEnrollmentListRequests, additionalParams?: { [key: string]: string }, config?: CsCourseServiceConfig): Observable<Course[]>;
}
```
