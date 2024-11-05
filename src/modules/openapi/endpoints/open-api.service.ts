import { Injectable } from "@nestjs/common";
import { OpenAPIObject } from "@nestjs/swagger";

@Injectable()
export class OpenAPIService {
    private _document: OpenAPIObject;

    getSpec(): Promise<OpenAPIObject> {
        return Promise.resolve(this._document);
    }

    setSpec(document: OpenAPIObject): void {
        this._document = document;
    }
}
