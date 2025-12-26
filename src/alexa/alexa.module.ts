import { Module } from '@nestjs/common';
import { AlexaController } from './alexa.controller';
import { JarvisModule } from '../jarvis/jarvis.module';

@Module({
  imports: [JarvisModule],
  controllers: [AlexaController],
})
export class AlexaModule {}

