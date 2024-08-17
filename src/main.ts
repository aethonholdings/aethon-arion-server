import { NestFactory } from "@nestjs/core";
import { RootModule } from "./modules/root/root.module";
import environment from "../env/environment";
import * as bodyParser from 'body-parser';

async function bootstrap() {
    let options: any = {};
    if (environment().dev) options = { cors: true }; // allow CORS for dev environment
    const app = await NestFactory.create(RootModule, options);
    app.setGlobalPrefix('arion');
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true})); 
    await app.listen(environment().listen);
}
bootstrap();
