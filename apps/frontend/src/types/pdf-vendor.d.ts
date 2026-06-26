declare module "pdfkit/js/pdfkit.standalone.js" {
  import PDFDocument from "pdfkit";
  export default PDFDocument;
}

declare module "blob-stream" {
  import type PDFDocument from "pdfkit";
  import type { Readable } from "stream";

  interface BlobStream extends Readable {
    toBlob(mimeType?: string): Blob;
  }

  export default function blobStream(): (doc: PDFDocument) => BlobStream;
}
