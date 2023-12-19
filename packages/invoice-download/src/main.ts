import { formatDate, firstDayOfYear, tomorrow } from "./utils";
import { Context } from "./common";
import { downloadInvocePdfs as jdDownloadInvocePdfs } from "./jd";

const sid = process.env.MAIL_263_SID || "";
const cid = process.env.MAIL_263_CID || "";
const uid = process.env.MAIL_263_UID || "";

console.log("sid", sid);
console.log("cid", cid);
console.log("uid", uid);

const context: Context = {
  sid,
  cid,
  uid,
  encodeUid: encodeURIComponent(uid),
  cookies: `cid_${uid.replace("@", "_")}=${cid};`,
  startData: formatDate(firstDayOfYear) + " 00:00:00",
  endData: formatDate(tomorrow) + " 00:00:00",
  mailSender: "",
};

jdDownloadInvocePdfs(context);
