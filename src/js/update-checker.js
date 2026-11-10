// Ascendra update checker. Checks GitHub for newer commits without modifying user data.
(() => {
  const branch = document.currentScript?.dataset.branch;
  if (!branch) return;
  const storageKey = "ascendra:update:seen:" + branch;
  const api = "https://api.github.com/repos/AscendraOfficial/Ascendra/commits/" + encodeURIComponent(branch);
  const intervalMs = 5 * 60 * 1000;
  let checking = false;
  let showing = false;

  function showUpdate(sha) {
    if (showing) return;
    showing = true;
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Ascendra update available");
    Object.assign(overlay.style, {position:"fixed",inset:"0",zIndex:"2147483647",background:"rgba(0,0,0,.65)",display:"grid",placeItems:"center",padding:"20px"});
    const panel = document.createElement("div");
    Object.assign(panel.style, {background:"#241535",color:"white",padding:"24px",borderRadius:"16px",maxWidth:"380px",width:"100%",fontFamily:"system-ui,sans-serif",boxShadow:"0 8px 32px #0006"});
    const title = document.createElement("h2");
    title.textContent = "Ascendra update available";
    const message = document.createElement("p");
    message.textContent = "A newer version is ready. Save any unfinished edits before updating. Your saved account data will not be cleared.";
    const actions = document.createElement("div");
    Object.assign(actions.style, {display:"flex",gap:"12px",justifyContent:"flex-end"});
    const later = document.createElement("button");
    later.textContent = "Later";
    const update = document.createElement("button");
    update.textContent = "Update now";
    for (const button of [later,update]) Object.assign(button.style,{padding:"10px 14px",borderRadius:"8px",cursor:"pointer"});
    later.addEventListener("click", () => { overlay.remove(); showing = false; });
    update.addEventListener("click", () => {
      // A reload runs Ascendra's existing startup/account-sync logic; it does not force a cloud write.
      localStorage.setItem(storageKey, sha);
      const url = new URL(location.href);
      url.searchParams.set("ascendraUpdate", sha.slice(0, 12));
      location.replace(url.href);
    });
    actions.append(later,update);
    panel.append(title,message,actions);
    overlay.append(panel);
    document.body.append(overlay);
    update.focus();
  }

  async function check() {
    if (checking || showing || document.hidden || !navigator.onLine) return;
    checking = true;
    try {
      const response = await fetch(api, {cache:"no-store",headers:{"Accept":"application/vnd.github+json"}});
      if (!response.ok) return;
      const data = await response.json();
      const sha = data.sha;
      if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha)) return;
      const seen = localStorage.getItem(storageKey);
      if (!seen) localStorage.setItem(storageKey, sha);
      else if (seen !== sha) showUpdate(sha);
    } catch (error) {
      console.debug("Ascendra update check unavailable:", error);
    } finally { checking = false; }
  }
  window.addEventListener("load", check);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  setInterval(check, intervalMs);
})();
