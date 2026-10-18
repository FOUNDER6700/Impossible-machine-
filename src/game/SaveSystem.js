const STORAGE_KEY = 'impossible_machine_proto_001_v1';

const DEFAULT_STATE = {
  collectedIds: [],
  portalActivated: false,
  completed: false,
  lookSensitivity: 1.0
};

export class SaveSystem {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_STATE, collectedIds: [] };
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_STATE, collectedIds: [] };
      }

      const validFragmentIds = ['frag_west', 'frag_east', 'frag_south'];
      const collectedIds = Array.isArray(parsed.collectedIds)
        ? parsed.collectedIds.filter(
            (id, index, self) =>
              typeof id === 'string' &&
              validFragmentIds.includes(id) &&
              self.indexOf(id) === index
          )
        : [];

      const portalActivated =
        Boolean(parsed.portalActivated) || collectedIds.length >= 3;
      const completed = Boolean(parsed.completed) && portalActivated;

      let lookSensitivity = Number(parsed.lookSensitivity);
      if (Number.isNaN(lookSensitivity) || lookSensitivity < 0.4 || lookSensitivity > 2.2) {
        lookSensitivity = DEFAULT_STATE.lookSensitivity;
      }

      return {
        collectedIds,
        portalActivated,
        completed,
        lookSensitivity
      };
    } catch (e) {
      // Handle Safari private mode or blocked storage gracefully
      console.warn('localStorage unavailable or corrupted, using in-memory defaults:', e);
      return { ...DEFAULT_STATE, collectedIds: [] };
    }
  }

  save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Unable to write state to localStorage:', e);
    }
  }

  getState() {
    return {
      ...this.state,
      collectedIds: [...this.state.collectedIds]
    };
  }

  recordFragment(id) {
    if (!this.state.collectedIds.includes(id)) {
      this.state.collectedIds.push(id);
    }
    if (this.state.collectedIds.length >= 3) {
      this.state.portalActivated = true;
    }
    this.save();
    return this.getState();
  }

  setPortalActivated(active) {
    this.state.portalActivated = Boolean(active);
    this.save();
  }

  setCompleted(completed) {
    this.state.completed = Boolean(completed);
    this.save();
  }

  setSensitivity(value) {
    const clamped = Math.min(2.2, Math.max(0.4, Number(value) || 1.0));
    this.state.lookSensitivity = clamped;
    this.save();
  }

  reset() {
    const preservedSensitivity = this.state.lookSensitivity;
    this.state = {
      collectedIds: [],
      portalActivated: false,
      completed: false,
      lookSensitivity: preservedSensitivity
    };
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      this.save();
    } catch (e) {
      console.warn('Unable to clear localStorage:', e);
    }
    return this.getState();
  }
        }
