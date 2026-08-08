export type Box={x:number;y:number;width:number;height:number};
export type Book={id:string;title:string;author:string;confidence:number;box:Box;rating?:number;ratingsCount?:number;source?:string};
export type Usage={input_tokens?:number;output_tokens?:number;total_tokens?:number};
export type Analysis={id:string;model:string;books:Book[];usage?:Usage;latencyMs?:number;createdAt:number};
export type TruthBook={id:string;title:string;author:string;box?:Box};
export type Match={truth:TruthBook;prediction?:Book;score:number};
export type Grade={model:string;precision:number;recall:number;f1:number;titleAccuracy:number;authorAccuracy:number;localization:number;truePositive:number;falsePositive:number;missed:number;latencyMs:number;inputTokens:number;outputTokens:number};