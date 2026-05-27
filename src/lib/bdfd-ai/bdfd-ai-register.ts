import { container } from '@sapphire/framework';
import { RagService } from './rag.service.js';

const rag = new RagService();
container.rag = rag;

await rag.init();

console.log('registered bdfd-ai');

declare module '@sapphire/pieces' {
    interface Container {
        rag: RagService;
    }
}
