import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { RootModule } from "./modules/root/root.module";
import environment from "../env/environment";
import * as bodyParser from "body-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { APIRequestInterceptor } from "./common/interceptors/api-request/api-request.interceptor";
import { DefaultExceptionFilter } from "./common/filters/default-exception/default-exception.filter";
import { OpenAPIService } from "./modules/openapi/endpoints/open-api.service";
import * as fs from "fs";

async function bootstrap() {
    const env = environment();
    let options: any = {};
    // allow CORS for localhost dev environment
    env.root.dev ? (options = { cors: true }) : null;
    // create the root module, disabling the built-in body parser so that the custom
    // body parser with a higher limit is used instead
    options.bodyParser = false;
    const app = await NestFactory.create<NestExpressApplication>(RootModule, options);

    // behind a local reverse proxy (nginx), take the client address from X-Forwarded-For, so that the login rate
    // limit counts each client separately rather than every request as coming from the proxy
    app.set("trust proxy", "loopback");

    // set global prefix for all routes
    app.setGlobalPrefix("arion");

    // allow for large JSON payloads
    app.use(bodyParser.json({ limit: "50mb" }));

    // allow for large URL encoded payloads
    app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

    // create the Swagger documentation and initialise it into the OpenAPI service
    const config = new DocumentBuilder()
        .setTitle("Arion")
        .setDescription("The Arion API description")
        .setVersion("0.1")
        .addTag("SimSet")
        .addTag("SimConfig")
        .addTag("OrgConfig")
        .addTag("Result")
        .addTag("StateSpace")
        .addTag("OptimiserState")
        .addTag("OpenAPI")
        .addTag("Auth")
        .addTag("Run")
        .addTag("Progress")
        .addTag("Fleet")
        .addTag("Node")
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    if (env.root.dev) {
        SwaggerModule.setup("api", app, document, { useGlobalPrefix: true, jsonDocumentUrl: "api/json" });
        fs.writeFileSync("./swagger/open-api.json", JSON.stringify(document));
    }
    app.get(OpenAPIService).setSpec(document);

    // add validation pipe
    app.useGlobalPipes(new ValidationPipe({ disableErrorMessages: env.root.dev ? false : true }));

    // set up exception filters
    app.useGlobalFilters(new DefaultExceptionFilter());

    // add global interceptors
    app.useGlobalInterceptors(new APIRequestInterceptor());

    // start the server
    await app.listen(env.root.listen); // start the server
}
bootstrap();
