import type { ChatReply, ChatMessage } from '../types';
export interface ChatAdapter { reply(input:string,contextCourseId?:string,history?:ChatMessage[]):Promise<ChatReply> }
