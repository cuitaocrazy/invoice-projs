import {
  Context,
  downloadPdf,
  downloadZip,
  fetchMailContent,
  getInvoiceDownloadUrls,
} from "./common";
import { creatTask, retry } from "./utils";
import fs from "fs";
import * as cheerio from "cheerio";
import cliProgress from "cli-progress";

const dir = "./pdf/jd";

async function getJDMailDownloadUrls(context: Context, mailId: string) {
  const res = await fetchMailContent(context, mailId);

  const $ = cheerio.load(res);
  let link = $('a[href*=".zip"]');

  if (link.length === 1) {
    return {
      downloadLink: link[0].attribs["href"],
      invoiceId: "",
    };
  }

  link = $("a[href^='http://3.cn/']");

  const invoiceText = $('td:contains("发票号码")').text();

  const invoiceCodeRegex = /发票代码[:：]\s*(\d+)/;
  const invoiceNumberRegex = /发票号码[:：]\s*(\d+)/;

  const invoiceCodeMatch = invoiceText.match(invoiceCodeRegex);
  const invoiceNumberMatch = invoiceText.match(invoiceNumberRegex);

  const invoiceCode = invoiceCodeMatch ? invoiceCodeMatch[1] : null;
  const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : null;

  if (invoiceNumber === null) {
    throw new Error(mailId);
  }

  const invoiceId = invoiceCode
    ? `${invoiceCode}-${invoiceNumber}`
    : invoiceNumber;

  if (link.length === 2) {
    return {
      downloadLink: link[1].attribs["href"],
      invoiceId,
    };
  }

  if (link.length === 1) {
    return {
      downloadLink: link[0].attribs["href"],
      invoiceId,
    };
  }

  link = $('a[href*=".pdf"]');

  if (link.length === 1) {
    return {
      downloadLink: link[0].attribs["href"],
      invoiceId,
    };
  }

  link = $("span:contains('.pdf')");

  if (link.length === 1) {
    return {
      downloadLink: link.text(),
      invoiceId,
    };
  }

  throw new Error(mailId);
}

function getInvoceIds() {
  const files = fs.readdirSync(dir);
  return files.map((filename) => {
    return filename.replace(".pdf", "");
  });
}

export async function downloadInvocePdfs(context: Context) {
  const jd_context = { ...context, mailSender: "customer_service@jd.com" };
  console.log("遍历邮箱");
  const res = await getInvoiceDownloadUrls(jd_context, getJDMailDownloadUrls);

  console.log("下载发票");
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(res.length, 0);
  const zipFiles = res.filter((item) => item.invoiceId === "");
  const pdfFiles = res.filter((item) => item.invoiceId !== "");

  const task = creatTask(10);

  const dz = downloadZip(dir);
  const dp = downloadPdf(dir);

  for (let item of zipFiles) {
    await task.push(() => dz(item.downloadLink).then(() => bar.increment()));
  }

  await task.wait();

  const invoiceIds = new Set(getInvoceIds());
  const distinctPdfFiles = pdfFiles.filter((item) => {
    const ret = !invoiceIds.has(item.invoiceId);
    if (ret) {
      invoiceIds.add(item.invoiceId);
    } else {
      bar.increment();
    }
    return ret;
  });

  for (let item of distinctPdfFiles) {
    await task.push(() =>
      retry(() => dp(item.invoiceId, item.downloadLink)).then(() =>
        bar.increment()
      )
    );
  }

  await task.wait();
  bar.stop();
}
