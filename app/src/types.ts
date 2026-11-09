export interface Course { id:string; title:string; subject:string; level:string; audience:string; priceVnd:number; sessions:number; schedule:string; mode:'online'|'onsite'; goals:string[]; isSample:boolean }
export interface Teacher { id:string; name:string; specialty:string; introduction:string; courseIds:string[]; isSample:boolean }
export interface Faq { id:string; question:string; answer:string; aliases:string[]; relatedIds:string[] }
export interface Settings { brand:string; chatMode:'mock'; isSample:boolean; timeZone:string; bookingHorizonDays:number; slots:string[]; goals:{id:string;title:string}[] }
export interface ChatReply { message:string; faqIds:string[]; courseIds:string[]; suggestions:[string,string,string]; action:'answer'|'clarify'|'offer_booking'; mode:'mock'|'gemini'; knownFacts?:string[]; missingFacts?:string[]; notice?:string }
export interface ChatMessage { id:string; role:'bot'|'user'; text:string; createdAt:string; reply?:ChatReply; courseId?:string; bookingCourseId?:string; bookingPrompt?:boolean }
export interface Booking { id:string; schemaVersion:1; name:string; phone:string; date:string; time:string; timeZone:string; note:string; courseId?:string; status:'active'|'processed'; createdAt:string }
export interface BookingInput { name:string; phone:string; date:string; time:string; note:string; courseId?:string }
export interface BookingSnapshot { bookings:Booking[]; error?:string }
