declare module "pdf-parse" {
  type ResultadoPdf = { text: string };
  function pdfParse(buffer: Buffer): Promise<ResultadoPdf>;
  export default pdfParse;
}
declare module "pdf-parse/lib/pdf-parse.js" {
  type ResultadoPdf = { text: string };
  function pdfParse(buffer: Buffer): Promise<ResultadoPdf>;
  export default pdfParse;
}
