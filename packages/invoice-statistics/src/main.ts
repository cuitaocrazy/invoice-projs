import fs from "fs";
import path from "path";
import PDFParser, { Output } from "pdf2json";
import cliProgress from "cli-progress";

function getPath() {
  const pdfDir = process.argv[2] ? process.argv[2] : "./pdf";

  if (path.isAbsolute(pdfDir)) {
    return pdfDir;
  }
  return path.join(process.cwd(), pdfDir);
}
const pdfDir = getPath();

// support node 16 because of pkg
function readDirRecursively(dir: string, files: string[] = []) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      readDirRecursively(filePath, files);
    } else {
      files.push(filePath);
    }
  }
  return files;
}

const pdfFiles = readDirRecursively(pdfDir).filter((file) =>
  file.toLowerCase().endsWith(".pdf")
);

async function parsePdf(pdfFile: string) {
  return new Promise<Output>((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData) => reject(errData));
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      resolve(pdfData);
    });
    pdfParser.loadPDF(pdfFile);
  });
}

function getAnchor(output: Output, anchor: string) {
  const finded = output.Pages[0].Texts.find((text) => {
    return decodeURIComponent(text.R[0].T).includes(anchor);
  });
  return finded ? { x: finded.x, y: finded.y } : undefined;
}

function getTextAfterAnchor(output: Output, anchor: { x: number; y: number }) {
  const texts = output.Pages[0].Texts.filter((text) => {
    return (
      text.x > anchor.x && text.y < anchor.y + 0.2 && text.y > anchor.y - 0.2
    );
  });

  return texts
    .sort((a, b) => {
      return a.x - b.x;
    })
    .map((text) => {
      return decodeURIComponent(text.R[0].T);
    })
    .join("");
}

function getAmount(output: Output) {
  const anchor = getAnchor(output, "小写");

  if (anchor === undefined) {
    return undefined;
  }

  const txt = getTextAfterAnchor(output, anchor);
  const reg = /(\d+(\.\d+)?)/;
  const match = reg.exec(txt);
  if (match) {
    return parseFloat(match[1]);
  } else {
    return undefined;
  }
}

function getInvoiceCode(output: Output) {
  const anchor = getAnchor(output, "发票代码");

  if (anchor === undefined) {
    return undefined;
  }

  const txt = getTextAfterAnchor(output, anchor);

  const reg = /(\d+)/;
  const match = reg.exec(txt);

  if (match) {
    return match[1];
  } else {
    return undefined;
  }
}

function getInvoiceNumber(output: Output) {
  const anchor = getAnchor(output, "发票号码");

  if (anchor === undefined) {
    return undefined;
  }

  const txt = getTextAfterAnchor(output, anchor);

  const reg = /(\d+)/;
  const match = reg.exec(txt);

  if (match) {
    return match[1];
  } else {
    return undefined;
  }
}

function getId(code: string | undefined, number: string | undefined) {
  if (code === undefined) {
    return number;
  }

  if (number === undefined) {
    return undefined;
  }

  return `${code}-${number}`;
}

async function main() {
  const csv = fs.createWriteStream(path.join(process.cwd(), "statistics.csv"));
  const ids = new Set<string>();
  csv.write("filename,id,invoice code,invoice number,amount\n");
  let total = 0;
  // const pdfFiles = [
  //   "/Users/cuitao/projects/test/pdf/pdf/jd/011002200511-68240463.pdf",
  // ];
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(pdfFiles.length, 0);
  for (let pdfFile of pdfFiles) {
    bar.increment();
    const pdfData = await parsePdf(pdfFile);

    // console.log(JSON.stringify(pdfData, null, 2));
    const code = getInvoiceCode(pdfData);
    const number = getInvoiceNumber(pdfData);
    const id = getId(code, number);

    if (id === undefined) {
      console.warn(`miss ${pdfFile}`);
      continue;
    }

    if (ids.has(id)) {
      console.warn(`duplicate ${pdfFile}`);
      continue;
    }

    ids.add(id);

    const amount = getAmount(pdfData);
    const name = pdfFile.replace(path.join(pdfDir, "/"), "");

    // console.log(`${name}\t${amount}`);

    if (amount) {
      total += amount;
      csv.write(`${name},${id},${code ?? ""},${number},${amount}\n`);
    } else {
      console.warn(`miss ${pdfFile}`);
    }
  }

  bar.stop();

  console.log(total.toFixed(2));
  csv.write(`total,${total.toFixed(2)}\n`);
  csv.end();
}

main();
