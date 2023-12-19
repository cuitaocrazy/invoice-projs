import { creatTask, formatDate, once, today, yesterday } from "./utils";
import * as cheerio from "cheerio";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";

export type Context = {
  sid: string;
  cid: string;
  uid: string;
  encodeUid: string;
  cookies: string;
  startData: string;
  endData: string;
  mailSender: string;
};

export async function getMailIds(context: Context) {
  const listPageUrl =
    "https://mail.263.net/wm2e/mail/mailIndex/mailIndexAction_indexList.do";
  const postQstrObj = {
    ifQuick: 0,
    startTime: context.startData,
    endTime: context.endData,
    sender: context.mailSender,
    // topic: "批量"
  };

  function getPostBody(pageNo: number) {
    return `pageNo=${pageNo}&folderId=&type=&qstr=${encodeURIComponent(
      JSON.stringify(postQstrObj)
    )}&usr=${context.encodeUid}&sid=${context.sid}&start=&keyInfo=&sort=`;
  }

  function fetchListPage(pageNo: number) {
    const postBody = getPostBody(pageNo);
    return fetch(listPageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: context.cookies,
      },
      body: postBody,
    }).then((res) => res.text());
  }

  function idsParser($: cheerio.CheerioAPI) {
    const mailDomList = $(".mailItem");
    const maillist = mailDomList
      .map((_, item) => {
        const title = $(item).find(".readText").text();
        const id = $(item).find("[name='singleMail']").attr("value")!;
        let time = $(item).find(".time").text();
        if (time.includes("今天")) {
          time = time.replace("今天", formatDate(today).substring(5));
        }
        if (time.includes("昨天")) {
          time = time.replace("昨天", formatDate(yesterday).substring(5));
        }
        const sender = $(item).find("nobr > span").attr("title")!;
        return { title, id, time, sender };
      })
      .toArray();

    return maillist;
  }

  const getPageCount = once(function ($: cheerio.CheerioAPI) {
    const pageCountEle = $(
      "table > tbody > tr > td > div > div > a > span"
    ).first();

    const countStr = pageCountEle.text();

    const reg = /\d\/(\d+)/;
    const matchRes = countStr.match(reg);
    if (matchRes) {
      const pageCount = matchRes[1];
      return parseInt(pageCount);
    }
    return 0;
  });

  async function getIdsByOnePageList(pageNo: number) {
    const postBody = getPostBody(pageNo);
    const res = await fetchListPage(pageNo);
    const $ = cheerio.load(res);
    const _ids = idsParser($);
    return [getPageCount($), _ids] as const;
  }

  const [totalPage, _ids] = await getIdsByOnePageList(1);
  const ids = [..._ids];

  if (totalPage === 0) {
    return ids;
  }

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(totalPage, 1);

  const task = creatTask(10);

  for (let i = 2; i <= totalPage; i++) {
    await task.push(() =>
      getIdsByOnePageList(i)
        .then(([, _ids]) => ids.push(..._ids))
        .then(() => {
          bar.increment();
        })
    );
  }

  await task.wait();
  bar.stop();

  return ids.sort((a, b) => (a.time > b.time ? -1 : 1));
}

export const downloadPdf = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
  return async (filename: string, url: string) => {
    const res = await fetch(url).then((res) => res.arrayBuffer());
    const buf = Buffer.from(res);
    fs.writeFileSync(path.join(dir, filename + ".pdf"), buf);
  };
};

export const downloadZip = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
  return async (url: string) => {
    const res = await fetch(url).then((res) => res.arrayBuffer());
    const zip = new AdmZip(Buffer.from(res));
    zip.extractAllTo(dir);
  };
};

export async function fetchMailContent(context: Context, mailId: string) {
  const mailDetailUrl = `https://mail.263.net/wm2e/mail/mailOperate/mailOperateAction_mailContent.do?&emailIdentity=${mailId}`;

  return await fetch(mailDetailUrl, {
    method: "POST",
    body: `sid=${context.sid}&usr=${context.encodeUid}`,
    headers: {
      Cookie: context.cookies,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).then((res) => res.text());
}

export async function fetchMailInfo(context: Context, mailId: string) {
  const mailDetailUrl = `https://mail.263.net/wm2e/mail/mailOperate/mailOperateAction_mailInfo.do?mailOperateType=read&emailIdentity=${mailId}`;

  return await fetch(mailDetailUrl, {
    method: "POST",
    body: `sid=${context.sid}&usr=${context.encodeUid}&qstr=%7B%7D&sortStr=%7B%22time%22%3A%22desc%22%7D&fstr=%7B%7D&folderId=1&type=1&fullSearchIfmIsHide=null`,
    headers: {
      Cookie: context.cookies,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).then((res) => res.text());
}

export async function getInvoiceDownloadUrls<T>(
  context: Context,
  getDownloadUrls: (context: Context, mailId: string) => Promise<T>
) {
  const mailIds = await getMailIds(context);

  type MI = (typeof mailIds)[number];
  type DU = typeof getDownloadUrls extends (
    context: Context,
    mailId: string
  ) => Promise<infer R>
    ? R
    : never;
  const infos: (MI & DU)[] = [];

  console.log("遍历邮件内容");
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(mailIds.length, 0);

  const task = creatTask(10);
  for (let id of mailIds) {
    await task.push(async () => {
      const urls = await getDownloadUrls(context, id.id).catch((e) => {
        console.log(e.message);
        throw e;
      });
      bar.increment();
      infos.push({ ...id, ...urls });
    });
  }
  await task.wait();
  bar.stop();
  return infos;
}
