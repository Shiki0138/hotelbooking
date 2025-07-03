// Japanese prefectures and major cities data

export const prefectures = [
  'Hokkaido',
  'Aomori',
  'Iwate',
  'Miyagi',
  'Akita',
  'Yamagata',
  'Fukushima',
  'Ibaraki',
  'Tochigi',
  'Gunma',
  'Saitama',
  'Chiba',
  'Tokyo',
  'Kanagawa',
  'Niigata',
  'Toyama',
  'Ishikawa',
  'Fukui',
  'Yamanashi',
  'Nagano',
  'Gifu',
  'Shizuoka',
  'Aichi',
  'Mie',
  'Shiga',
  'Kyoto',
  'Osaka',
  'Hyogo',
  'Nara',
  'Wakayama',
  'Tottori',
  'Shimane',
  'Okayama',
  'Hiroshima',
  'Yamaguchi',
  'Tokushima',
  'Kagawa',
  'Ehime',
  'Kochi',
  'Fukuoka',
  'Saga',
  'Nagasaki',
  'Kumamoto',
  'Oita',
  'Miyazaki',
  'Kagoshima',
  'Okinawa',
];

const citiesByPrefecture: Record<string, string[]> = {
  'Hokkaido': ['Sapporo', 'Asahikawa', 'Hakodate', 'Kushiro', 'Obihiro', 'Otaru', 'Tomakomai'],
  'Tokyo': ['Shinjuku', 'Shibuya', 'Chiyoda', 'Minato', 'Meguro', 'Setagaya', 'Nakano', 'Toshima', 'Shinagawa', 'Ota', 'Bunkyo', 'Taito', 'Sumida', 'Koto', 'Adachi', 'Katsushika', 'Edogawa'],
  'Osaka': ['Osaka City', 'Sakai', 'Higashiosaka', 'Hirakata', 'Toyonaka', 'Takatsuki', 'Suita', 'Ibaraki'],
  'Kyoto': ['Kyoto City', 'Uji', 'Kameoka', 'Joyo', 'Nagaokakyo', 'Fukuchiyama', 'Maizuru', 'Ayabe'],
  'Kanagawa': ['Yokohama', 'Kawasaki', 'Sagamihara', 'Fujisawa', 'Yokosuka', 'Kamakura', 'Odawara', 'Atsugi'],
  'Aichi': ['Nagoya', 'Toyohashi', 'Okazaki', 'Toyota', 'Ichinomiya', 'Kasugai', 'Anjo', 'Toyokawa'],
  'Hyogo': ['Kobe', 'Himeji', 'Nishinomiya', 'Amagasaki', 'Akashi', 'Kakogawa', 'Takarazuka', 'Itami'],
  'Fukuoka': ['Fukuoka City', 'Kitakyushu', 'Kurume', 'Omuta', 'Nogata', 'Iizuka', 'Nakama', 'Ogori'],
  'Chiba': ['Chiba City', 'Funabashi', 'Matsudo', 'Ichikawa', 'Kashiwa', 'Ichihara', 'Narita', 'Sakura'],
  'Saitama': ['Saitama City', 'Kawaguchi', 'Kawagoe', 'Koshigaya', 'Tokorozawa', 'Kasukabe', 'Ageo', 'Kumagaya'],
  'Shizuoka': ['Shizuoka City', 'Hamamatsu', 'Numazu', 'Atami', 'Mishima', 'Fuji', 'Fujinomiya', 'Ito'],
  'Hiroshima': ['Hiroshima City', 'Fukuyama', 'Kure', 'Higashihiroshima', 'Onomichi', 'Hatsukaichi', 'Mihara'],
  'Miyagi': ['Sendai', 'Ishinomaki', 'Osaki', 'Tome', 'Kurihara', 'Kesennuma', 'Shiogama', 'Natori'],
  'Nagano': ['Nagano City', 'Matsumoto', 'Ueda', 'Iida', 'Saku', 'Azumino', 'Chino', 'Ina'],
  'Niigata': ['Niigata City', 'Nagaoka', 'Joetsu', 'Sanjo', 'Kashiwazaki', 'Shibata', 'Murakami'],
  'Kumamoto': ['Kumamoto City', 'Yatsushiro', 'Hitoyoshi', 'Arao', 'Minamata', 'Tamana', 'Yamaga'],
  'Kagoshima': ['Kagoshima City', 'Kirishima', 'Kanoya', 'Satsumasendai', 'Ibusuki', 'Tarumizu'],
  'Okinawa': ['Naha', 'Okinawa City', 'Uruma', 'Ginowan', 'Urasoe', 'Nago', 'Itoman', 'Tomigusuku'],
  'Nara': ['Nara City', 'Kashihara', 'Yamatokoriyama', 'Tenri', 'Sakurai', 'Gojo', 'Gose', 'Ikoma'],
  'Wakayama': ['Wakayama City', 'Kainan', 'Hashimoto', 'Arida', 'Gobo', 'Tanabe', 'Shingu'],
  'Mie': ['Tsu', 'Yokkaichi', 'Suzuka', 'Matsusaka', 'Kuwana', 'Ise', 'Iga', 'Nabari'],
  'Shiga': ['Otsu', 'Kusatsu', 'Nagahama', 'Higashiomi', 'Hikone', 'Moriyama', 'Ritto', 'Koka'],
  'Gifu': ['Gifu City', 'Ogaki', 'Takayama', 'Tajimi', 'Seki', 'Nakatsugawa', 'Minokamo'],
  'Tochigi': ['Utsunomiya', 'Oyama', 'Tochigi City', 'Sano', 'Kanuma', 'Nikko', 'Otawara'],
  'Gunma': ['Maebashi', 'Takasaki', 'Ota', 'Isesaki', 'Kiryu', 'Shibukawa', 'Tatebayashi'],
  'Ibaraki': ['Mito', 'Tsukuba', 'Hitachi', 'Tsuchiura', 'Koga', 'Ishioka', 'Yuki', 'Ryugasaki'],
  'Yamagata': ['Yamagata City', 'Yonezawa', 'Tsuruoka', 'Sakata', 'Shinjo', 'Sagae', 'Kaminoyama'],
  'Fukushima': ['Fukushima City', 'Iwaki', 'Koriyama', 'Aizuwakamatsu', 'Sukagawa', 'Nihonmatsu'],
  'Akita': ['Akita City', 'Noshiro', 'Yokote', 'Odate', 'Oga', 'Yuzawa', 'Daisen', 'Yurihonjo'],
  'Iwate': ['Morioka', 'Ichinoseki', 'Oshu', 'Hanamaki', 'Kitakami', 'Miyako', 'Ofunato'],
  'Aomori': ['Aomori City', 'Hachinohe', 'Hirosaki', 'Towada', 'Misawa', 'Kuroishi', 'Goshogawara'],
  'Yamanashi': ['Kofu', 'Fuefuki', 'Kai', 'Minami-Alps', 'Fuji-Yoshida', 'Hokuto', 'Otsuki'],
  'Toyama': ['Toyama City', 'Takaoka', 'Imizu', 'Uozu', 'Himi', 'Namerikawa', 'Kurobe'],
  'Ishikawa': ['Kanazawa', 'Hakusan', 'Komatsu', 'Kaga', 'Nomi', 'Nanao', 'Wajima'],
  'Fukui': ['Fukui City', 'Sakai', 'Echizen', 'Sabae', 'Tsuruga', 'Obama', 'Ono', 'Katsuyama'],
  'Okayama': ['Okayama City', 'Kurashiki', 'Tsuyama', 'Tamano', 'Kasaoka', 'Ibara', 'Soja'],
  'Yamaguchi': ['Yamaguchi City', 'Shimonoseki', 'Ube', 'Shunan', 'Hofu', 'Kudamatsu', 'Iwakuni'],
  'Shimane': ['Matsue', 'Hamada', 'Izumo', 'Masuda', 'Oda', 'Yasugi', 'Gotsu', 'Unnan'],
  'Tottori': ['Tottori City', 'Yonago', 'Kurayoshi', 'Sakaiminato'],
  'Kagawa': ['Takamatsu', 'Marugame', 'Sakaide', 'Zentsuji', 'Kanonji', 'Sanuki', 'Higashikagawa'],
  'Tokushima': ['Tokushima City', 'Naruto', 'Komatsushima', 'Anan', 'Yoshinogawa', 'Mima'],
  'Ehime': ['Matsuyama', 'Imabari', 'Uwajima', 'Yawatahama', 'Niihama', 'Saijo', 'Ozu'],
  'Kochi': ['Kochi City', 'Nankoku', 'Susaki', 'Sukumo', 'Tosashimizu', 'Shimanto', 'Konan'],
  'Saga': ['Saga City', 'Karatsu', 'Tosu', 'Imari', 'Takeo', 'Kashima', 'Ogi', 'Ureshino'],
  'Nagasaki': ['Nagasaki City', 'Sasebo', 'Isahaya', 'Omura', 'Hirado', 'Tsushima', 'Unzen'],
  'Oita': ['Oita City', 'Beppu', 'Nakatsu', 'Hita', 'Saiki', 'Usuki', 'Tsukumi', 'Taketa'],
  'Miyazaki': ['Miyazaki City', 'Miyakonojo', 'Nobeoka', 'Nichinan', 'Kobayashi', 'Hyuga'],
};

export const getCitiesByPrefecture = (prefecture: string): string[] => {
  return citiesByPrefecture[prefecture] || [];
};

export const getAllCities = (): string[] => {
  const allCities: string[] = [];
  Object.values(citiesByPrefecture).forEach(cities => {
    allCities.push(...cities);
  });
  return [...new Set(allCities)].sort();
};

export const searchLocations = (query: string): { prefectures: string[]; cities: string[] } => {
  const lowercaseQuery = query.toLowerCase();
  
  const matchingPrefectures = prefectures.filter(pref => 
    pref.toLowerCase().includes(lowercaseQuery)
  );
  
  const matchingCities = getAllCities().filter(city => 
    city.toLowerCase().includes(lowercaseQuery)
  );
  
  return {
    prefectures: matchingPrefectures,
    cities: matchingCities,
  };
};