export type DSTRule = "EU" | "US" | "AU" | "NZ";

/** Day-of-month of the Nth Sunday in the given month (month: 0-indexed) */
function nthSunday(year: number, month: number, n: number): number {
  const d = new Date(year, month, 1);
  const firstSunday = d.getDay() === 0 ? 1 : 8 - d.getDay();
  return firstSunday + (n - 1) * 7;
}

/** Day-of-month of the last Sunday in the given month (month: 0-indexed) */
function lastSunday(year: number, month: number): number {
  const last = new Date(year, month + 1, 0);
  return last.getDate() - last.getDay();
}

/**
 * Returns +1 if DST is active on the given date, 0 otherwise.
 * All rules add 1 hour during local summer.
 *
 * EU: last Sun March → last Sun October  (covers all Europe incl. UK/IE/PT)
 * US: 2nd Sun March  → 1st Sun November  (US & Canada)
 * AU: 1st Sun October → 1st Sun April    (NSW, VIC, TAS, ACT)
 * NZ: last Sun September → 1st Sun April
 */
export function getDSTAdjustment(rule: DSTRule, date: Date): number {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  switch (rule) {
    case "EU": {
      const s = lastSunday(y, 2), e = lastSunday(y, 9); // Mar, Oct
      if (m > 2 && m < 9) return 1;
      if (m === 2 && d >= s) return 1;
      if (m === 9 && d < e) return 1;
      return 0;
    }
    case "US": {
      const s = nthSunday(y, 2, 2), e = nthSunday(y, 10, 1); // 2nd Sun Mar, 1st Sun Nov
      if (m > 2 && m < 10) return 1;
      if (m === 2 && d >= s) return 1;
      if (m === 10 && d < e) return 1;
      return 0;
    }
    case "AU": {
      // Southern hemisphere: DST in Oct–Apr
      const s = nthSunday(y, 9, 1), e = nthSunday(y, 3, 1); // 1st Sun Oct, 1st Sun Apr
      if (m > 9 || m < 3) return 1;
      if (m === 9 && d >= s) return 1;
      if (m === 3 && d < e) return 1;
      return 0;
    }
    case "NZ": {
      // Southern hemisphere: DST in Sep–Apr
      const s = lastSunday(y, 8), e = nthSunday(y, 3, 1); // last Sun Sep, 1st Sun Apr
      if (m > 8 || m < 3) return 1;
      if (m === 8 && d >= s) return 1;
      if (m === 3 && d < e) return 1;
      return 0;
    }
  }
}

/** IATA code → { city (zh-TW), utc: standard offset, dst?: DST rule } */
export const AIRPORT_INFO: Record<string, { city: string; utc: number; dst?: DSTRule }> = {
  // Asia Pacific (no DST)
  TPE: { city: "台北桃園", utc: 8 }, TSA: { city: "台北松山", utc: 8 },
  HKG: { city: "香港", utc: 8 }, SIN: { city: "新加坡", utc: 8 },
  KUL: { city: "吉隆坡", utc: 8 }, MNL: { city: "馬尼拉", utc: 8 },
  NRT: { city: "東京成田", utc: 9 }, HND: { city: "東京羽田", utc: 9 },
  KIX: { city: "大阪關西", utc: 9 }, CTS: { city: "札幌", utc: 9 },
  ICN: { city: "首爾仁川", utc: 9 }, GMP: { city: "首爾金浦", utc: 9 },
  PVG: { city: "上海浦東", utc: 8 }, PEK: { city: "北京", utc: 8 },
  CAN: { city: "廣州", utc: 8 }, CTU: { city: "成都", utc: 8 },
  BKK: { city: "曼谷", utc: 7 }, DMK: { city: "曼谷廊曼", utc: 7 },
  CGK: { city: "雅加達", utc: 7 }, DPS: { city: "峇里島", utc: 8 },
  HAN: { city: "河內", utc: 7 }, SGN: { city: "胡志明市", utc: 7 },
  SYD: { city: "雪梨", utc: 10, dst: "AU" }, MEL: { city: "墨爾本", utc: 10, dst: "AU" },
  BNE: { city: "布里斯本", utc: 10 }, PER: { city: "伯斯", utc: 8 }, // QLD & WA: no DST
  AKL: { city: "奧克蘭", utc: 12, dst: "NZ" },
  // Middle East (no DST)
  DXB: { city: "杜拜", utc: 4 }, DWC: { city: "杜拜世界中心", utc: 4 },
  AUH: { city: "阿布達比", utc: 4 }, DOH: { city: "多哈", utc: 3 },
  KWI: { city: "科威特", utc: 3 }, BAH: { city: "巴林", utc: 3 },
  RUH: { city: "利雅德", utc: 3 }, AMM: { city: "安曼", utc: 3 },
  // Europe (EU DST: last Sun Mar → last Sun Oct)
  LHR: { city: "倫敦希斯洛", utc: 0, dst: "EU" }, LGW: { city: "倫敦蓋威克", utc: 0, dst: "EU" },
  LIS: { city: "里斯本", utc: 0, dst: "EU" }, DUB: { city: "都柏林", utc: 0, dst: "EU" },
  CDG: { city: "巴黎戴高樂", utc: 1, dst: "EU" }, ORY: { city: "巴黎奧利", utc: 1, dst: "EU" },
  FRA: { city: "法蘭克福", utc: 1, dst: "EU" }, MUC: { city: "慕尼黑", utc: 1, dst: "EU" },
  BER: { city: "柏林", utc: 1, dst: "EU" }, AMS: { city: "阿姆斯特丹", utc: 1, dst: "EU" },
  FCO: { city: "羅馬", utc: 1, dst: "EU" }, MXP: { city: "米蘭馬爾奔薩", utc: 1, dst: "EU" },
  VCE: { city: "威尼斯", utc: 1, dst: "EU" }, ZRH: { city: "蘇黎世", utc: 1, dst: "EU" },
  VIE: { city: "維也納", utc: 1, dst: "EU" }, MAD: { city: "馬德里", utc: 1, dst: "EU" },
  BCN: { city: "巴塞隆納", utc: 1, dst: "EU" }, ARN: { city: "斯德哥爾摩", utc: 1, dst: "EU" },
  OSL: { city: "奧斯陸", utc: 1, dst: "EU" }, CPH: { city: "哥本哈根", utc: 1, dst: "EU" },
  HEL: { city: "赫爾辛基", utc: 2, dst: "EU" }, WAW: { city: "華沙", utc: 1, dst: "EU" },
  PRG: { city: "布拉格", utc: 1, dst: "EU" }, BUD: { city: "布達佩斯", utc: 1, dst: "EU" },
  ATH: { city: "雅典", utc: 2, dst: "EU" }, IST: { city: "伊斯坦堡", utc: 3 }, // Turkey: no DST since 2016
  // Americas
  JFK: { city: "紐約甘迺迪", utc: -5, dst: "US" }, EWR: { city: "紐約紐瓦克", utc: -5, dst: "US" },
  LGA: { city: "紐約拉瓜地亞", utc: -5, dst: "US" }, BOS: { city: "波士頓", utc: -5, dst: "US" },
  MIA: { city: "邁阿密", utc: -5, dst: "US" }, YYZ: { city: "多倫多", utc: -5, dst: "US" },
  ATL: { city: "亞特蘭大", utc: -5, dst: "US" }, IAD: { city: "華盛頓杜勒斯", utc: -5, dst: "US" },
  ORD: { city: "芝加哥", utc: -6, dst: "US" }, DFW: { city: "達拉斯", utc: -6, dst: "US" },
  IAH: { city: "休士頓", utc: -6, dst: "US" }, MEX: { city: "墨西哥城", utc: -6 }, // Mexico: no DST since 2023
  DEN: { city: "丹佛", utc: -7, dst: "US" }, PHX: { city: "鳳凰城", utc: -7 }, // Arizona: no DST
  LAX: { city: "洛杉磯", utc: -8, dst: "US" }, SFO: { city: "舊金山", utc: -8, dst: "US" },
  SEA: { city: "西雅圖", utc: -8, dst: "US" }, YVR: { city: "溫哥華", utc: -8, dst: "US" },
  LAS: { city: "拉斯維加斯", utc: -8, dst: "US" },
  GRU: { city: "聖保羅", utc: -3 }, EZE: { city: "布宜諾斯艾利斯", utc: -3 },
  SCL: { city: "聖地牙哥", utc: -3 }, LIM: { city: "利馬", utc: -5 },
  BOG: { city: "波哥大", utc: -5 },
  // Africa (no DST)
  CAI: { city: "開羅", utc: 2 }, JNB: { city: "約翰尼斯堡", utc: 2 },
  CPT: { city: "開普敦", utc: 2 }, NBO: { city: "奈洛比", utc: 3 },
  ADD: { city: "阿迪斯阿貝巴", utc: 3 }, CMN: { city: "卡薩布蘭卡", utc: 0 },
};
