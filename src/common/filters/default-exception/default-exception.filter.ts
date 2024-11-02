import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { EntityNotFoundError, QueryFailedError } from "typeorm";
import { Response } from "express";
import { APIResponseError } from "aethon-api-types";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { RequestWithMeta } from "src/common/types/types";
import { log } from "src/common/utils/utils";

// filter handling unhandled errors, converting them to the desired HTTP status code
@Catch()
export class DefaultExceptionFilter implements ExceptionFilter {
    private readonly _logger = new Logger(DefaultExceptionFilter.name);

    catch(exception: Error, host: ArgumentsHost) {
        const httpHost: HttpArgumentsHost = host.switchToHttp();
        const response: Response = httpHost.getResponse();
        const request: RequestWithMeta = httpHost.getRequest();
        let status: number;
        let message: string;

        if (exception instanceof HttpException) {
            // if the exception is an instance of HttpException, we can get the status and message from it
            status = exception.getStatus();
            message = exception.message;
        } else {
            // if the exception is not an instance of HttpException, we need to handle it
            // make Internal Server Error the default status and message
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = "Internal Server Error";

            // for specific types of errors, we can give more specific status and message
            if (exception instanceof EntityNotFoundError) {
                status = HttpStatus.NOT_FOUND;
                message = "Not Found";
            }
            if (exception instanceof QueryFailedError) {
                status = HttpStatus.BAD_REQUEST;
                message = "Bad request";
            }
            exception = new HttpException(message, status);
        }
        status === HttpStatus.INTERNAL_SERVER_ERROR
            ? this._logger.error(
                  log("Error response", `(${status}) ${exception.message} - Request ID: ${request.meta.id}`)
              )
            : this._logger.verbose(
                  log("Error response", `(${status}) ${exception.message} - Request ID: ${request.meta.id}`)
              );
        response.status(status).json({
            requestId: request.meta.id,
            responseTimeMs: Date.now() - request.meta.startTimeStamp,
            success: false,
            path: request.url,
            requestMethod: request.method,
            error: {
                status: status,
                message: message
            }
        } as APIResponseError);
    }
}
