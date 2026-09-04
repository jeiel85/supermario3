// Game Genie Cheats for Super Mario Bros. 3 (NES)
export const SMB3_DEFAULT_CHEATS = [
  {
    id: 'infinite_lives',
    code: 'SLXPLOVS',
    name: '무한 목숨 (Infinite Lives)',
    desc: '목숨이 줄어들지 않아 게임오버 없이 무제한으로 플레이할 수 있습니다.',
    enabled: false,
  },
  {
    id: 'infinite_time',
    code: 'SZKIKXVK',
    name: '시간 무제한 (Infinite Time)',
    desc: '스테이지 제한시간 카운트다운이 멈춥니다.',
    enabled: false,
  },
  {
    id: 'instant_p_meter',
    code: 'AOVZVGEY',
    name: 'P-미터 즉시 완충 (Instant Max Dash)',
    desc: '조금만 달려도 P-게이지가 최대치로 차올라 즉시 날아오를 수 있습니다.',
    enabled: false,
  },
  {
    id: 'permanent_p_wing',
    code: 'SXEZSKOU',
    name: '무한 비행 P-날개 (Permanent P-Wing)',
    desc: 'P-미터가 영구 유지되어 하늘을 끝없이 계속 비행할 수 있습니다.',
    enabled: false,
  },
  {
    id: 'always_raccoon',
    code: 'VNXALGZE',
    name: '항상 너구리 마리오 (Always Raccoon Mario)',
    desc: '파워다운되거나 시작 시 꼬리 달린 너구리 마리오 상태가 유지됩니다.',
    enabled: false,
  },
  {
    id: 'always_tanooki',
    code: 'XNXALGZE',
    name: '항상 타누키 마리오 (Always Tanooki Mario)',
    desc: '지장보살 무적 변신이 가능한 전설의 타누키 수트 상태를 유지합니다.',
    enabled: false,
  },
  {
    id: 'always_hammer',
    code: 'SNXALGZE',
    name: '항상 해머 마리오 (Always Hammer Mario)',
    desc: '철벽 방어 등껍질과 유령도 잡는 강력한 망치를 던질 수 있습니다.',
    enabled: false,
  },
  {
    id: 'always_frog',
    code: 'NNXALGZE',
    name: '항상 개구리 마리오 (Always Frog Mario)',
    desc: '물속에서 최고의 스피드와 기동력을 발휘하는 개구리 수트 상태를 유지합니다.',
    enabled: false,
  },
  {
    id: 'always_fire',
    code: 'POXALGZE',
    name: '항상 파이어 마리오 (Always Fire Mario)',
    desc: '화염구를 발사하는 파이어 마리오 상태를 유지합니다.',
    enabled: false,
  },
  {
    id: 'always_super',
    code: 'AEXALGZA',
    name: '항상 수퍼 마리오 (Always Super Mario)',
    desc: '항상 버섯을 먹은 덩치 큰 수퍼 마리오 상태를 유지합니다.',
    enabled: false,
  },
];

export class CheatManager {
  constructor(emulatorEngine) {
    this.engine = emulatorEngine;
    this.cheats = this.loadSavedCheats();
  }

  loadSavedCheats() {
    try {
      const saved = localStorage.getItem('smb3_cheats');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all defaults exist
        return SMB3_DEFAULT_CHEATS.map(def => {
          const found = parsed.find(p => p.id === def.id || p.code === def.code);
          return found ? { ...def, enabled: found.enabled } : def;
        }).concat(parsed.filter(p => !SMB3_DEFAULT_CHEATS.some(def => def.id === p.id || def.code === p.code)));
      }
    } catch (e) {
      console.warn('Failed to load cheats from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(SMB3_DEFAULT_CHEATS));
  }

  saveCheats() {
    try {
      localStorage.setItem('smb3_cheats', JSON.stringify(this.cheats));
    } catch (e) {
      console.warn('Failed to save cheats:', e);
    }
  }

  getCheats() {
    return this.cheats;
  }

  toggleCheat(id) {
    const cheat = this.cheats.find(c => c.id === id);
    if (cheat) {
      cheat.enabled = !cheat.enabled;
      this.saveCheats();
      this.applyCheatsToEngine();
      return cheat.enabled;
    }
    return false;
  }

  addCustomCheat(code, name, desc = '') {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode || (cleanCode.length !== 6 && cleanCode.length !== 8)) {
      throw new Error('Game Genie 코드는 6자리 또는 8자리 영문자여야 합니다.');
    }
    const newCheat = {
      id: 'custom_' + Date.now(),
      code: cleanCode,
      name: name.trim() || `치트 (${cleanCode})`,
      desc: desc.trim() || '사용자 지정 치트 코드',
      enabled: true,
      custom: true,
    };
    this.cheats.push(newCheat);
    this.saveCheats();
    this.applyCheatsToEngine();
    return newCheat;
  }

  removeCheat(id) {
    this.cheats = this.cheats.filter(c => c.id !== id);
    this.saveCheats();
    this.applyCheatsToEngine();
  }

  applyCheatsToEngine() {
    if (!this.engine || !this.engine.nostalgist) return;
    try {
      const activeCodes = this.cheats.filter(c => c.enabled).map(c => c.code);
      console.log('Applying active Game Genie codes:', activeCodes);
      // Nostalgist / RetroArch cheat command or Emscripten memory patching if supported
      // RetroArch supports sending cheat commands or using .cht files
    } catch (e) {
      console.warn('Error applying cheats:', e);
    }
  }
}
