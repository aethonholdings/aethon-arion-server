import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { APIResponseData } from "aethon-api-types";
import { Paginated } from "aethon-nestjs-paginate";
import { map, Observable } from "rxjs";
import { RequestWithMeta } from "src/common/types/types";
import { log } from "src/common/utils/utils";

@Injectable()
export class APIRequestInterceptor implements NestInterceptor {
    private readonly _logger = new Logger(APIRequestInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const startTimeStamp: number = Date.now();
        const rand: number = Math.floor(Math.random() * 1000000000);
        const id: string = `${startTimeStamp}:${rand}`;
        const request: RequestWithMeta = context.switchToHttp().getRequest();
        request.meta = { id, startTimeStamp };
        this._logger.verbose(log("Request", `${request.method} ${request.url} - Request ID: ${id}`));
        return next.handle().pipe(
            map(<T>(data: T[] | T | Paginated<T>) => {
                this._logger.verbose(log("Data response", `${request.method} ${request.url} - Request ID: ${id}`));
                return {
                    requestId: id,
                    responseTimeMs: Date.now() - startTimeStamp,
                    success: true,
                    path: request.url,
                    requestMethod: request.method,
                    paginated: data instanceof Paginated,
                    payload: data
                } as APIResponseData<T>;
            })
        );
    }
}
