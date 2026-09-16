(function exposeFixedCollections(globalScope) {
  "use strict";

  const VERSION = 1;
  const MAX_COLLECTIONS = 5;
  const MAX_MEMBERS = 10;
  const MAX_NAME_LENGTH = 64;
  const MAX_TITLE_LENGTH = 512;

  function cleanText(value, maxLength) {
    if (typeof value !== "string") return "";
    const cleaned = value.trim().replace(/\s+/g, " ").normalize("NFKC");
    return cleaned && cleaned.length <= maxLength ? cleaned : "";
  }

  function cleanName(value) {
    return cleanText(value, MAX_NAME_LENGTH);
  }

  function cleanTitle(value) {
    return cleanText(value, MAX_TITLE_LENGTH);
  }

  // Collection names remain case-insensitive; conversation titles use cleanTitle
  // directly so case-distinct native conversations remain separate members.
  function normalize(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase();
  }

  function createEmptyState() {
    return { version: VERSION, collections: [] };
  }

  function sanitizeState(candidate) {
    if (!candidate || candidate.version !== VERSION || !Array.isArray(candidate.collections)) {
      return createEmptyState();
    }

    const collections = [];
    const seenNames = new Set();
    for (const rawCollection of candidate.collections) {
      if (collections.length >= MAX_COLLECTIONS) break;
      const name = cleanName(rawCollection?.name);
      const nameKey = normalize(name);
      if (!nameKey || seenNames.has(nameKey) || !Array.isArray(rawCollection?.members)) continue;

      const members = [];
      const seenMembers = new Set();
      for (const rawTitle of rawCollection.members) {
        if (members.length >= MAX_MEMBERS) break;
        const title = cleanTitle(rawTitle);
        const titleKey = title;
        if (!titleKey || seenMembers.has(titleKey)) continue;
        seenMembers.add(titleKey);
        members.push(title);
      }

      seenNames.add(nameKey);
      collections.push({ name, members });
    }
    return { version: VERSION, collections };
  }

  function result(state, status) {
    return { state: sanitizeState(state), status };
  }

  function createCollection(current, value) {
    const state = sanitizeState(current);
    const name = cleanName(value);
    if (!name) return result(state, "invalid-name");
    if (state.collections.some((collection) => normalize(collection.name) === normalize(name))) {
      return result(state, "exists");
    }
    if (state.collections.length >= MAX_COLLECTIONS) return result(state, "collection-limit");
    return result({ ...state, collections: [...state.collections, { name, members: [] }] }, "created");
  }

  function addMember(current, collectionName, value) {
    const state = sanitizeState(current);
    const title = cleanTitle(value);
    if (!title) return result(state, "invalid-title");
    const index = state.collections.findIndex(
      (collection) => normalize(collection.name) === normalize(cleanName(collectionName))
    );
    if (index < 0) return result(state, "collection-not-found");
    const collection = state.collections[index];
    if (collection.members.some((member) => member === title)) {
      return result(state, "exists");
    }
    if (collection.members.length >= MAX_MEMBERS) return result(state, "member-limit");

    const collections = state.collections.slice();
    collections[index] = { ...collection, members: [...collection.members, title] };
    return result({ ...state, collections }, "added");
  }

  function removeMember(current, collectionName, memberTitle) {
    const state = sanitizeState(current);
    const collectionKey = normalize(cleanName(collectionName));
    const titleKey = cleanTitle(memberTitle);
    const index = state.collections.findIndex((collection) => normalize(collection.name) === collectionKey);
    if (index < 0) return result(state, "collection-not-found");
    const collection = state.collections[index];
    const members = collection.members.filter((member) => member !== titleKey);
    if (members.length === collection.members.length) return result(state, "member-not-found");

    const collections = state.collections.slice();
    collections[index] = { ...collection, members };
    return result({ ...state, collections }, "removed");
  }

  function deleteCollection(current, collectionName) {
    const state = sanitizeState(current);
    const collectionKey = normalize(cleanName(collectionName));
    const collections = state.collections.filter(
      (collection) => normalize(collection.name) !== collectionKey
    );
    if (collections.length === state.collections.length) return result(state, "collection-not-found");
    return result({ ...state, collections }, "deleted");
  }

  const api = Object.freeze({
    VERSION,
    MAX_COLLECTIONS,
    MAX_MEMBERS,
    createEmptyState,
    sanitizeState,
    createCollection,
    addMember,
    removeMember,
    deleteCollection,
  });

  globalScope.MirrorFixedCollections = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
