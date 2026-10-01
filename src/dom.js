const byId = (id) => document.getElementById(id);

export const video = byId("video");
export const canvas = byId("canvas");
export const statusText = byId("status");
export const bar = byId("bar");
export const promptBox = byId("promptBox");
export const promptInput = byId("promptInput");
export const perfMain = byId("perfMain");
export const downloadBtn = byId("downloadBtn");
export const shotBtn = byId("shotBtn");
export const retakeBtn = byId("retakeBtn");
export const analyzeBtn = byId("analyzeBtn");
export const answer = byId("answer");
export const deleteBtn = byId("deleteBtn");
export const modal = byId("modal");
export const reqList = byId("reqList");
export const reqNote = byId("reqNote");
export const perfModal = byId("perfModal");
export const storeChk = byId("storeChk");
export const confirmBtn = byId("confirmBtn");

export const status = (text) => (statusText.textContent = text);
