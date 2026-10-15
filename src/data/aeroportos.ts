// IATA -> [cidade, latitude, longitude, pais]. Cobre os aeroportos que concentram
// quase todo o volume da Zupper; codigo fora da lista aparece nas tabelas mas nao no mapa.
export type Aero = [cidade: string, lat: number, lng: number, pais: string];

export const AEROPORTOS: Record<string, Aero> = {
  // Brasil
  GRU: ["São Paulo (Guarulhos)", -23.4356, -46.4731, "BR"], CGH: ["São Paulo (Congonhas)", -23.6261, -46.6564, "BR"],
  VCP: ["Campinas", -23.0074, -47.1345, "BR"], GIG: ["Rio de Janeiro (Galeão)", -22.81, -43.2506, "BR"],
  SDU: ["Rio de Janeiro (Santos Dumont)", -22.9105, -43.1631, "BR"], BSB: ["Brasília", -15.8711, -47.9186, "BR"],
  REC: ["Recife", -8.1265, -34.9236, "BR"], FOR: ["Fortaleza", -3.7763, -38.5326, "BR"], SSA: ["Salvador", -12.9086, -38.3225, "BR"],
  BEL: ["Belém", -1.3793, -48.4763, "BR"], CWB: ["Curitiba", -25.5285, -49.1758, "BR"], CNF: ["Belo Horizonte (Confins)", -19.6244, -43.9719, "BR"],
  FLN: ["Florianópolis", -27.6703, -48.5525, "BR"], POA: ["Porto Alegre", -29.9944, -51.1714, "BR"], GYN: ["Goiânia", -16.632, -49.2207, "BR"],
  MAO: ["Manaus", -3.0386, -60.0497, "BR"], CGB: ["Cuiabá", -15.6529, -56.1167, "BR"], IGU: ["Foz do Iguaçu", -25.5963, -54.487, "BR"],
  AJU: ["Aracaju", -10.984, -37.0703, "BR"], MCZ: ["Maceió", -9.5108, -35.7917, "BR"], JPA: ["João Pessoa", -7.1458, -34.9486, "BR"],
  NAT: ["Natal", -5.7681, -35.3761, "BR"], CGR: ["Campo Grande", -20.4687, -54.6725, "BR"], NVT: ["Navegantes (Balneário Camboriú)", -26.88, -48.6514, "BR"],
  VIX: ["Vitória", -20.2581, -40.2864, "BR"], SLZ: ["São Luís", -2.5854, -44.2341, "BR"], BPS: ["Porto Seguro", -16.4386, -39.0809, "BR"],
  THE: ["Teresina", -5.0599, -42.8235, "BR"], BVB: ["Boa Vista", 2.8463, -60.6901, "BR"], MCP: ["Macapá", 0.0507, -51.0722, "BR"],
  JDO: ["Juazeiro do Norte", -7.2189, -39.27, "BR"], PMW: ["Palmas", -10.2915, -48.357, "BR"], PNZ: ["Petrolina", -9.3624, -40.5691, "BR"],
  PVH: ["Porto Velho", -8.7093, -63.9023, "BR"], MGF: ["Maringá", -23.476, -52.0166, "BR"], CAC: ["Cascavel", -25.0003, -53.5008, "BR"],
  UDI: ["Uberlândia", -18.8836, -48.2253, "BR"], VDC: ["Vitória da Conquista", -14.8628, -40.8631, "BR"], IOS: ["Ilhéus", -14.816, -39.0332, "BR"],
  RBR: ["Rio Branco", -9.8689, -67.8981, "BR"], LDB: ["Londrina", -23.3336, -51.1301, "BR"], XAP: ["Chapecó", -27.1342, -52.6566, "BR"],
  RAO: ["Ribeirão Preto", -21.1364, -47.7767, "BR"], JOI: ["Joinville", -26.2245, -48.7974, "BR"], MAB: ["Marabá", -5.3686, -49.138, "BR"],
  OPS: ["Sinop", -11.885, -55.5861, "BR"], SJP: ["São José do Rio Preto", -20.8166, -49.4065, "BR"], STM: ["Santarém", -2.4247, -54.7928, "BR"],
  MOC: ["Montes Claros", -16.7069, -43.8189, "BR"], CPV: ["Campina Grande", -7.2699, -35.8964, "BR"], CXJ: ["Caxias do Sul", -29.1971, -51.1875, "BR"],
  IMP: ["Imperatriz", -5.5313, -47.46, "BR"], PFB: ["Passo Fundo", -28.244, -52.3266, "BR"], CKS: ["Carajás", -6.1153, -50.0035, "BR"],
  IZA: ["Juiz de Fora (Zona da Mata)", -21.513, -43.173, "BR"], JJD: ["Jericoacoara", -2.9072, -40.359, "BR"], PPB: ["Presidente Prudente", -22.1751, -51.4246, "BR"],
  PET: ["Pelotas", -31.7184, -52.3277, "BR"], AUX: ["Araguaína", -7.2278, -48.2408, "BR"], FEN: ["Fernando de Noronha", -3.8549, -32.4233, "BR"],
  DOU: ["Dourados", -22.2019, -54.9267, "BR"], BYO: ["Bonito", -21.2472, -56.4525, "BR"], CLV: ["Caldas Novas", -17.7253, -48.6075, "BR"],
  UBA: ["Uberaba", -19.7647, -47.9661, "BR"], CZS: ["Cruzeiro do Sul", -7.5999, -72.7695, "BR"], PHB: ["Parnaíba", -2.8937, -41.7319, "BR"],
  SJK: ["São José dos Campos", -23.2292, -45.8615, "BR"], JJG: ["Jaguaruna", -28.6753, -49.0606, "BR"], JPR: ["Ji-Paraná", -10.8708, -61.8465, "BR"],
  BRA: ["Barreiras", -12.0789, -45.009, "BR"], PIN: ["Parintins", -2.673, -56.777, "BR"], CFB: ["Cabo Frio", -22.9217, -42.0743, "BR"],
  MII: ["Marília", -22.1969, -49.9264, "BR"], CMG: ["Corumbá", -19.0119, -57.6714, "BR"], ITB: ["Itaituba", -4.2423, -56.0007, "BR"],
  ROO: ["Rondonópolis", -16.5861, -54.7246, "BR"], GEL: ["Santo Ângelo", -28.2817, -54.1691, "BR"], OAL: ["Cacoal", -11.496, -61.4508, "BR"],
  ATM: ["Altamira", -3.2539, -52.254, "BR"], BVH: ["Vilhena", -12.6944, -60.0983, "BR"], MVF: ["Mossoró", -5.2019, -37.3644, "BR"],
  GVR: ["Governador Valadares", -18.8952, -41.9822, "BR"], PTO: ["Pato Branco", -26.2172, -52.6928, "BR"], BPG: ["Barra do Garças", -15.8613, -52.3891, "BR"],
  TMT: ["Oriximiná (Trombetas)", -1.4896, -56.3968, "BR"], POJ: ["Patos de Minas", -18.6728, -46.4916, "BR"], TBT: ["Tabatinga", -4.2556, -69.9358, "BR"],
  // America do Sul e Central
  MVD: ["Montevidéu", -34.8384, -56.0308, "UY"], AEP: ["Buenos Aires (Aeroparque)", -34.5592, -58.4156, "AR"], EZE: ["Buenos Aires (Ezeiza)", -34.8222, -58.5358, "AR"],
  ASU: ["Assunção", -25.24, -57.519, "PY"], SCL: ["Santiago", -33.393, -70.7858, "CL"], CCS: ["Caracas", 10.6012, -66.9913, "VE"], BOG: ["Bogotá", 4.7016, -74.1469, "CO"],
  PBM: ["Paramaribo", 5.4528, -55.1878, "SR"], PUJ: ["Punta Cana", 18.5674, -68.3634, "DO"], CUZ: ["Cusco", -13.5357, -71.9388, "PE"], LIM: ["Lima", -12.0219, -77.1143, "PE"],
  MDZ: ["Mendoza", -32.8317, -68.7929, "AR"], AUA: ["Aruba", 12.5014, -70.0152, "AW"], ADZ: ["San Andrés", 12.5836, -81.7112, "CO"], BRC: ["Bariloche", -41.1512, -71.1575, "AR"],
  USH: ["Ushuaia", -54.8433, -68.3058, "AR"], FTE: ["El Calafate", -50.2803, -72.0531, "AR"], PDP: ["Punta del Este", -34.8551, -55.0943, "UY"], CTG: ["Cartagena", 10.4424, -75.513, "CO"],
  COR: ["Córdoba", -31.3236, -64.208, "AR"], PEI: ["Pereira", 4.8127, -75.7395, "CO"], CUN: ["Cancún", 21.0365, -86.8771, "MX"], MDE: ["Medellín", 6.1645, -75.4231, "CO"],
  GUA: ["Cidade da Guatemala", 14.5833, -90.5275, "GT"], UIO: ["Quito", -0.1292, -78.3575, "EC"], MEX: ["Cidade do México", 19.4363, -99.0721, "MX"], HAV: ["Havana", 22.9892, -82.4091, "CU"],
  ROS: ["Rosário", -32.9036, -60.785, "AR"], CJC: ["Calama", -22.4982, -68.9036, "CL"], CLO: ["Cali", 3.5432, -76.3816, "CO"], CUR: ["Curaçao", 12.1889, -68.9598, "CW"],
  LPB: ["La Paz", -16.5133, -68.1923, "BO"], BAQ: ["Barranquilla", 10.8896, -74.7808, "CO"], MGA: ["Manágua", 12.1415, -86.1682, "NI"], AQP: ["Arequipa", -16.3411, -71.5831, "PE"],
  SAL: ["San Salvador", 13.4409, -89.0557, "SV"], PTY: ["Cidade do Panamá", 9.0714, -79.3835, "PA"], EQS: ["Esquel", -42.908, -71.1395, "AR"], CIJ: ["Cobija", -11.0407, -68.783, "BO"],
  PUQ: ["Punta Arenas", -53.0026, -70.8546, "CL"], GEO: ["Georgetown", 6.4985, -58.2541, "GY"], PCL: ["Pucallpa", -8.3779, -74.5743, "PE"], OAX: ["Oaxaca", 16.9999, -96.7266, "MX"],
  SMR: ["Santa Marta", 11.1196, -74.2306, "CO"], IQQ: ["Iquique", -20.5352, -70.1813, "CL"], GDL: ["Guadalajara", 20.5218, -103.3111, "MX"], LET: ["Letícia", -4.1935, -69.9432, "CO"],
  // America do Norte
  MCO: ["Orlando", 28.4294, -81.3089, "US"], MIA: ["Miami", 25.7959, -80.287, "US"], JFK: ["Nova York (JFK)", 40.6413, -73.7781, "US"], FLL: ["Fort Lauderdale", 26.0726, -80.1527, "US"],
  YYZ: ["Toronto", 43.6777, -79.6248, "CA"], LAX: ["Los Angeles", 33.9416, -118.4085, "US"], MDW: ["Chicago (Midway)", 41.7868, -87.7522, "US"], ORD: ["Chicago (O'Hare)", 41.9742, -87.9073, "US"],
  SAN: ["San Diego", 32.7338, -117.1933, "US"], YUL: ["Montreal", 45.4706, -73.7408, "CA"], BOS: ["Boston", 42.3656, -71.0096, "US"], LAS: ["Las Vegas", 36.084, -115.1537, "US"],
  YVR: ["Vancouver", 49.1951, -123.1779, "CA"], TPA: ["Tampa", 27.9755, -82.5332, "US"], MCI: ["Kansas City", 39.2976, -94.7139, "US"], LGA: ["Nova York (LaGuardia)", 40.7769, -73.874, "US"],
  SFO: ["São Francisco", 37.6213, -122.379, "US"], ATL: ["Atlanta", 33.6407, -84.4277, "US"], AUS: ["Austin", 30.1975, -97.6664, "US"], OKC: ["Oklahoma City", 35.3931, -97.6007, "US"],
  YYJ: ["Victoria", 48.6469, -123.426, "CA"],
  // Europa
  LIS: ["Lisboa", 38.7742, -9.1342, "PT"], MAD: ["Madri", 40.4983, -3.5676, "ES"], OPO: ["Porto", 41.2481, -8.6814, "PT"], VIE: ["Viena", 48.1103, 16.5697, "AT"],
  FCO: ["Roma", 41.8003, 12.2389, "IT"], LHR: ["Londres (Heathrow)", 51.47, -0.4543, "GB"], BCN: ["Barcelona", 41.2974, 2.0833, "ES"], CDG: ["Paris (CDG)", 49.0097, 2.5479, "FR"],
  ORY: ["Paris (Orly)", 48.7262, 2.3652, "FR"], BRU: ["Bruxelas", 50.901, 4.4856, "BE"], VLC: ["Valência", 39.4893, -0.4816, "ES"], AMS: ["Amsterdã", 52.3105, 4.7683, "NL"],
  TLL: ["Tallinn", 59.4133, 24.8328, "EE"], LCY: ["Londres (City)", 51.5053, 0.0553, "GB"], FLR: ["Florença", 43.81, 11.2051, "IT"], MXP: ["Milão", 45.6306, 8.7281, "IT"],
  GVA: ["Genebra", 46.237, 6.1092, "CH"], ARN: ["Estocolmo", 59.6519, 17.9186, "SE"], DUB: ["Dublin", 53.4264, -6.2499, "IE"], MRS: ["Marselha", 43.4393, 5.2214, "FR"],
  BER: ["Berlim", 52.3667, 13.5033, "DE"], VCE: ["Veneza", 45.5053, 12.3519, "IT"], IBZ: ["Ibiza", 38.8729, 1.3731, "ES"], LEJ: ["Leipzig", 51.4324, 12.2416, "DE"],
  ZRH: ["Zurique", 47.4647, 8.5492, "CH"], WAW: ["Varsóvia", 52.1657, 20.9671, "PL"], DUS: ["Düsseldorf", 51.2895, 6.7668, "DE"], MUC: ["Munique", 48.3538, 11.7861, "DE"],
  NTE: ["Nantes", 47.1532, -1.6107, "FR"], BLQ: ["Bolonha", 44.5354, 11.2887, "IT"], NAP: ["Nápoles", 40.886, 14.2908, "IT"],
  // Asia, Africa, Oceania
  BKK: ["Bangkok", 13.69, 100.7501, "TH"], DXB: ["Dubai", 25.2532, 55.3657, "AE"], PEK: ["Pequim", 40.0799, 116.6031, "CN"], PVG: ["Xangai", 31.1443, 121.8083, "CN"],
  HND: ["Tóquio (Haneda)", 35.5494, 139.7798, "JP"], NRT: ["Tóquio (Narita)", 35.772, 140.3929, "JP"], GMP: ["Seul (Gimpo)", 37.5583, 126.7906, "KR"], HKG: ["Hong Kong", 22.308, 113.9185, "HK"],
  DEL: ["Nova Délhi", 28.5562, 77.1, "IN"], KIX: ["Osaka (Kansai)", 34.432, 135.2304, "JP"], ITM: ["Osaka (Itami)", 34.7855, 135.438, "JP"], CAN: ["Cantão", 23.3924, 113.2988, "CN"],
  DLC: ["Dalian", 38.9657, 121.5386, "CN"], AUH: ["Abu Dhabi", 24.433, 54.6511, "AE"], BEY: ["Beirute", 33.8209, 35.4884, "LB"], CMN: ["Casablanca", 33.3675, -7.5899, "MA"],
  DSS: ["Dacar", 14.67, -17.0733, "SN"], BEW: ["Beira", -19.7964, 34.9076, "MZ"], MPM: ["Maputo", -25.9208, 32.5726, "MZ"], CPT: ["Cidade do Cabo", -33.9715, 18.6021, "ZA"],
  JNB: ["Joanesburgo", -26.1337, 28.242, "ZA"], ABJ: ["Abidjã", 5.2614, -3.9263, "CI"], ADL: ["Adelaide", -34.945, 138.5306, "AU"],
};

export const temCoord = (c: string) => !!AEROPORTOS[c];
export const cidade = (c: string) => AEROPORTOS[c]?.[0] ?? c;
export const ehBrasil = (c: string) => AEROPORTOS[c]?.[3] === "BR";

// ---- Regioes (drill-down da pagina Destinos) -------------------------------------------
const BR_REG: Record<string, string> = {};
const poe = (r: string, codigos: string) => codigos.split(" ").forEach((c) => (BR_REG[c] = r));
poe("Sudeste", "GRU CGH VCP GIG SDU CNF VIX UDI MOC RAO MII PPB SJK SJP IZA UBA CFB GVR POJ CPV");
poe("Nordeste", "REC FOR SSA AJU MCZ JPA NAT SLZ THE IMP BPS IOS VDC JDO PNZ MVF BRA JJD PHB FEN CPV");
poe("Sul", "CWB FLN POA IGU JOI NVT MGF CAC LDB XAP PFB CXJ PET JJG GEL OAL");
poe("Centro-Oeste", "BSB GYN CGB CGR OPS CLV CMG ROO BPG DOU BYO");
poe("Norte", "BEL MAO PVH RBR PMW BVB MCP STM MAB CKS JPR PIN ATM BVH TMT TBT AUX CZS PTO ITB");
const PAIS_REG: Record<string, string> = {};
const poeP = (r: string, paises: string) => paises.split(" ").forEach((c) => (PAIS_REG[c] = r));
poeP("América do Sul", "AR UY PY CL BO PE CO EC VE GY SR");
poeP("América do Norte", "US CA MX");
poeP("América Central e Caribe", "GT CU NI SV PA DO AW CW");
poeP("Europa", "PT ES IT FR GB DE AT BE NL EE CH SE IE PL");
poeP("Ásia e Oriente Médio", "TH AE CN JP KR HK IN LB");
poeP("África", "MA SN MZ ZA CI");
poeP("Oceania", "AU");

export function regiao(c: string): string {
  const a = AEROPORTOS[c];
  if (!a) return "Sem classificação";
  if (a[3] === "BR") return BR_REG[c] ? `Brasil · ${BR_REG[c]}` : "Brasil · outras";
  return PAIS_REG[a[3]] ?? "Outros países";
}
