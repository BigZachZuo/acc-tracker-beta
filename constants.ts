
import { Track, Car } from './types';

export const TRACKS: Track[] = [
  // Base Game
  { 
    id: 'monza', 
    name: 'Monza Circuit', 
    country: 'Italy', 
    length: '5.793 km',
    imageUrl: '/assets/tracks/monza.svg'
  },
  { 
    id: 'zolder', 
    name: 'Zolder', 
    country: 'Belgium', 
    length: '4.011 km',
    imageUrl: '/assets/tracks/zolder.svg'
  },
  { 
    id: 'brands_hatch', 
    name: 'Brands Hatch', 
    country: 'UK', 
    length: '3.916 km',
    imageUrl: '/assets/tracks/brands_hatch.svg'
  },
  { 
    id: 'silverstone', 
    name: 'Silverstone', 
    country: 'UK', 
    length: '5.891 km',
    imageUrl: '/assets/tracks/silverstone.svg'
  },
  { 
    id: 'paul_ricard', 
    name: 'Paul Ricard', 
    country: 'France', 
    length: '5.771 km',
    imageUrl: '/assets/tracks/paul_ricard.svg'
  },
  { 
    id: 'misano', 
    name: 'Misano World Circuit', 
    country: 'Italy', 
    length: '4.226 km',
    imageUrl: '/assets/tracks/misano.svg'
  },
  { 
    id: 'zandvoort', 
    name: 'Zandvoort', 
    country: 'Netherlands', 
    length: '4.259 km',
    imageUrl: '/assets/tracks/zandvoort.svg'
  },
  { 
    id: 'spa', 
    name: 'Spa-Francorchamps', 
    country: 'Belgium', 
    length: '7.004 km',
    imageUrl: '/assets/tracks/spa.svg'
  },
  { 
    id: 'nurburgring', 
    name: 'Nürburgring', 
    country: 'Germany', 
    length: '5.148 km',
    imageUrl: '/assets/tracks/nurburgring.svg'
  },
  {
    id: 'hungaroring',
    name: 'Hungaroring',
    country: 'Hungary',
    length: '4.381 km',
    imageUrl: '/assets/tracks/hungaroring.svg'
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    length: '4.655 km',
    imageUrl: '/assets/tracks/barcelona.svg'
  },
  // 2020 GT World Challenge Pack
  {
    id: 'imola',
    name: 'Imola',
    country: 'Italy',
    length: '4.909 km',
    imageUrl: '/assets/tracks/imola.svg'
  },
  // Intercontinental GT Pack
  {
    id: 'mount_panorama',
    name: 'Mount Panorama',
    country: 'Australia',
    length: '6.213 km',
    imageUrl: '/assets/tracks/mount_panorama.svg'
  },
  {
    id: 'laguna_seca',
    name: 'Laguna Seca',
    country: 'USA',
    length: '3.602 km',
    imageUrl: '/assets/tracks/laguna_seca.svg'
  },
  {
    id: 'suzuka',
    name: 'Suzuka',
    country: 'Japan',
    length: '5.807 km',
    imageUrl: '/assets/tracks/suzuka.svg'
  },
  {
    id: 'kyalami',
    name: 'Kyalami',
    country: 'South Africa',
    length: '4.522 km',
    imageUrl: '/assets/tracks/kyalami.svg'
  },
  // British GT Pack
  {
    id: 'oulton_park',
    name: 'Oulton Park',
    country: 'UK',
    length: '4.307 km',
    imageUrl: '/assets/tracks/oulton_park.svg'
  },
  {
    id: 'snetterton',
    name: 'Snetterton',
    country: 'UK',
    length: '4.779 km',
    imageUrl: '/assets/tracks/snetterton.svg'
  },
  {
    id: 'donington',
    name: 'Donington Park',
    country: 'UK',
    length: '4.020 km',
    imageUrl: '/assets/tracks/donington.svg'
  },
  // Challengers Pack
  {
    id: 'valencia',
    name: 'Valencia',
    country: 'Spain',
    length: '4.005 km',
    imageUrl: '/assets/tracks/valencia.svg'
  },
  // American Track Pack
  {
    id: 'cota',
    name: 'COTA',
    country: 'USA',
    length: '5.513 km',
    imageUrl: '/assets/tracks/cota.svg'
  },
  {
    id: 'watkins_glen',
    name: 'Watkins Glen',
    country: 'USA',
    length: '5.430 km',
    imageUrl: '/assets/tracks/watkins_glen.svg'
  },
  {
    id: 'indianapolis',
    name: 'Indianapolis',
    country: 'USA',
    length: '3.925 km',
    imageUrl: '/assets/tracks/indianapolis.svg'
  },
  // GT2 Pack
  {
    id: 'red_bull_ring',
    name: 'Red Bull Ring',
    country: 'Austria',
    length: '4.318 km',
    imageUrl: '/assets/tracks/red_bull_ring.svg'
  },
  // 24h Nurburgring Pack
  {
    id: 'nurburgring_24h',
    name: 'Nürburgring 24h',
    country: 'Germany',
    length: '25.378 km',
    imageUrl: '/assets/tracks/nurburgring_24h.svg'
  }
];

export const CARS: Car[] = [
    // --- GT3 CLASS (Current & New) ---
    { id: 'amr_v8_vantage_gt3', name: 'V8 Vantage GT3 (2019)', class: 'GT3', brand: 'Aston Martin' },
    { id: 'audi_r8_lms_evo_ii', name: 'R8 LMS Evo II (2022)', class: 'GT3', brand: 'Audi' },
    { id: 'bmw_m4_gt3', name: 'M4 GT3 (2022)', class: 'GT3', brand: 'BMW' },
    { id: 'ferrari_296_gt3', name: '296 GT3 (2023)', class: 'GT3', brand: 'Ferrari' },
    { id: 'ford_mustang_gt3', name: 'Mustang GT3 (2024)', class: 'GT3', brand: 'Ford' },
    { id: 'honda_nsx_gt3_evo', name: 'NSX GT3 Evo (2019)', class: 'GT3', brand: 'Honda' },
    { id: 'lamborghini_huracan_gt3_evo2', name: 'Huracan GT3 Evo2 (2023)', class: 'GT3', brand: 'Lamborghini' },
    { id: 'mclaren_720s_gt3_evo', name: '720S GT3 Evo (2023)', class: 'GT3', brand: 'McLaren' },
    { id: 'mercedes_amg_gt3_evo', name: 'AMG GT3 Evo (2020)', class: 'GT3', brand: 'Mercedes-AMG' },
    { id: 'porsche_992_gt3_r', name: '911 (992) GT3 R (2023)', class: 'GT3', brand: 'Porsche' },
    { id: 'bentley_continental_gt3_2018', name: 'Continental GT3 (2018)', class: 'GT3', brand: 'Bentley' },
    { id: 'nissan_gt_r_nismo_gt3_2018', name: 'GT-R Nismo GT3 (2018)', class: 'GT3', brand: 'Nissan' },

    // --- GT3 CLASS (Older Generations) ---
    { id: 'amr_v12_vantage_gt3', name: 'V12 Vantage GT3 (2013)', class: 'GT3', brand: 'Aston Martin' },
    { id: 'audi_r8_lms_evo', name: 'R8 LMS Evo (2019)', class: 'GT3', brand: 'Audi' },
    { id: 'audi_r8_lms', name: 'R8 LMS (2015)', class: 'GT3', brand: 'Audi' },
    { id: 'bentley_continental_gt3_2015', name: 'Continental GT3 (2015)', class: 'GT3', brand: 'Bentley' },
    { id: 'bmw_m6_gt3', name: 'M6 GT3 (2017)', class: 'GT3', brand: 'BMW' },
    { id: 'bmw_z4_gt3', name: 'Z4 GT3 (2011)', class: 'GT3', brand: 'BMW' },
    { id: 'ferrari_488_gt3_evo', name: '488 GT3 Evo (2020)', class: 'GT3', brand: 'Ferrari' },
    { id: 'ferrari_488_gt3', name: '488 GT3 (2018)', class: 'GT3', brand: 'Ferrari' },
    { id: 'honda_nsx_gt3', name: 'NSX GT3 (2017)', class: 'GT3', brand: 'Honda' },
    { id: 'jaguar_g3', name: 'G3 (2012)', class: 'GT3', brand: 'Jaguar' },
    { id: 'lamborghini_huracan_gt3_evo', name: 'Huracan GT3 Evo (2019)', class: 'GT3', brand: 'Lamborghini' },
    { id: 'lamborghini_huracan_gt3', name: 'Huracan GT3 (2015)', class: 'GT3', brand: 'Lamborghini' },
    { id: 'lexus_rc_f_gt3', name: 'RC F GT3 (2016)', class: 'GT3', brand: 'Lexus' },
    { id: 'mclaren_720s_gt3', name: '720S GT3 (2019)', class: 'GT3', brand: 'McLaren' },
    { id: 'mclaren_650s_gt3', name: '650S GT3 (2015)', class: 'GT3', brand: 'McLaren' },
    { id: 'mercedes_amg_gt3', name: 'AMG GT3 (2015)', class: 'GT3', brand: 'Mercedes-AMG' },
    { id: 'nissan_gt_r_nismo_gt3_2015', name: 'GT-R Nismo GT3 (2015)', class: 'GT3', brand: 'Nissan' },
    { id: 'porsche_991ii_gt3_r', name: '911 (991II) GT3 R (2019)', class: 'GT3', brand: 'Porsche' },
    { id: 'porsche_991_gt3_r', name: '911 (991) GT3 R (2018)', class: 'GT3', brand: 'Porsche' },
    { id: 'reiter_engineering_r_ex_gt3', name: 'R-EX GT3 (2017)', class: 'GT3', brand: 'Reiter Engineering' },

    // --- GT2 CLASS ---
    { id: 'audi_r8_lms_gt2', name: 'R8 LMS GT2 (2019)', class: 'GT2', brand: 'Audi' },
    { id: 'ktm_xbow_gt2', name: 'X-Bow GT2 (2020)', class: 'GT2', brand: 'KTM' },
    { id: 'maserati_mc20_gt2', name: 'MC20 GT2 (2023)', class: 'GT2', brand: 'Maserati' },
    { id: 'mercedes_amg_gt2', name: 'AMG GT2 (2022)', class: 'GT2', brand: 'Mercedes-AMG' },
    { id: 'porsche_911_gt2_rs_cs_evo', name: '911 GT2 RS CS Evo (2019)', class: 'GT2', brand: 'Porsche' },
    { id: 'porsche_935', name: '935 (2019)', class: 'GT2', brand: 'Porsche' },

    // --- GT4 CLASS ---
    { id: 'alpine_a110_gt4', name: 'A110 GT4 (2018)', class: 'GT4', brand: 'Alpine' },
    { id: 'amr_v8_vantage_gt4', name: 'V8 Vantage GT4 (2018)', class: 'GT4', brand: 'Aston Martin' },
    { id: 'audi_r8_lms_gt4', name: 'R8 LMS GT4 (2016)', class: 'GT4', brand: 'Audi' },
    { id: 'bmw_m4_gt4', name: 'M4 GT4 (2018)', class: 'GT4', brand: 'BMW' },
    { id: 'chevrolet_camaro_gt4r', name: 'Camaro GT4.R (2017)', class: 'GT4', brand: 'Chevrolet' },
    { id: 'ginetta_g55_gt4', name: 'G55 GT4 (2012)', class: 'GT4', brand: 'Ginetta' },
    { id: 'ktm_xbow_gt4', name: 'X-Bow GT4 (2016)', class: 'GT4', brand: 'KTM' },
    { id: 'maserati_mc_gt4', name: 'MC GT4 (2016)', class: 'GT4', brand: 'Maserati' },
    { id: 'mclaren_570s_gt4', name: '570S GT4 (2016)', class: 'GT4', brand: 'McLaren' },
    { id: 'mercedes_amg_gt4', name: 'AMG GT4 (2016)', class: 'GT4', brand: 'Mercedes-AMG' },
    { id: 'porsche_718_cayman_gt4_mr', name: '718 Cayman GT4 MR (2019)', class: 'GT4', brand: 'Porsche' },
    { id: 'toyota_gr_supra_gt4', name: 'GR Supra GT4 (2020)', class: 'GT4', brand: 'Toyota' },

    // --- CUP / TCX / GTC CLASSES ---
    { id: 'porsche_992_gt3_cup', name: '911 (992) GT3 Cup (2021)', class: 'CUP', brand: 'Porsche' },
    { id: 'porsche_991ii_gt3_cup', name: '911 (991II) GT3 Cup (2017)', class: 'CUP', brand: 'Porsche' },
    { id: 'lamborghini_huracan_st_evo2', name: 'Huracan ST Evo2 (2021)', class: 'CUP', brand: 'Lamborghini' },
    { id: 'lamborghini_huracan_st', name: 'Huracan Super Trofeo (2015)', class: 'CUP', brand: 'Lamborghini' },
    { id: 'ferrari_488_challenge_evo', name: '488 Challenge Evo (2020)', class: 'CUP', brand: 'Ferrari' },
    { id: 'bmw_m2_cs_racing', name: 'M2 CS Racing (2020)', class: 'TCX', brand: 'BMW' },
];
