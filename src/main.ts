import { NestFactory } from "@nestjs/core";
import { RootModule } from "./modules/root/root.module";
import environment from "../env/environment";
import * as bodyParser from "body-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
    const env = environment();
    let options: any = {};
    env.root.dev ? (options = { cors: true }) : null; // allow CORS for localhost dev environment
    const app = await NestFactory.create(RootModule, options); // create the root module
    app.useGlobalPipes(new ValidationPipe({ disableErrorMessages: env.root.dev ? false : true })); // add validation pipe
    app.setGlobalPrefix("arion"); // set global prefix for all routes
    app.use(bodyParser.json({ limit: "50mb" })); // allow for large JSON payloads
    app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // allow for large URL encoded payloads
    // create the Swagger documentation
    if (env.root.dev) {
        const config = new DocumentBuilder()
            .setTitle("Arion")
            .setDescription("The Arion API description")
            .setVersion("0.1")
            .addTag("SimSet")
            .addTag("SimConfig")
            .addTag("OrgConfig")
            .addTag("Result")
            .addTag("StateSpace")
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup("api", app, document, { useGlobalPrefix: true, jsonDocumentUrl: "json" });
    }
    await app.listen(env.root.listen); // start the server
}
bootstrap();
