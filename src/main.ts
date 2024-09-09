import { NestFactory } from "@nestjs/core";
import { RootModule } from "./modules/root/root.module";
import environment from "../env/environment";
import * as bodyParser from "body-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
    let options: any = {};
    if (environment().dev) options = { cors: true }; // allow CORS for dev environment
    const app = await NestFactory.create(RootModule, options);
    app.setGlobalPrefix("arion"); // set global prefix for all routes
    app.use(bodyParser.json({ limit: "50mb" })); // allow for large JSON payloads
    app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // allow for large URL encoded payloads
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
    SwaggerModule.setup("api", app, document, { useGlobalPrefix: true });
    await app.listen(environment().listen);
}
bootstrap();
