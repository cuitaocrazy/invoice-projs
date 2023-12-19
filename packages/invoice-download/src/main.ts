import { formatDate, firstDayOfYear, tomorrow } from "./utils";
import { Context } from "./common";
import { downloadInvocePdfs as jdDownloadInvocePdfs } from "./jd";

const sid = "MXQxYTVvOC40YzZ1OWk1QDli";
const cid = "TVhReFlUVnZPQzQwWXpaMU9XazFRRGxp";
const uid = "tao.cui@bjyada.com";

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
