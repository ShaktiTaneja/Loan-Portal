// ====== Config ======
const API_BASE = "https://loan-portal-qlow.onrender.com"; // your backend URL

// ====== Clock ======
function updateClock() {
  document.getElementById("clock").innerText = new Date().toLocaleString();
}
setInterval(updateClock, 1000);
updateClock();

// ====== Modal ======
function openModal(html) {
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modal").style.display = "flex";
}
function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ====== Draft Handling ======
function loadDrafts() {
  return JSON.parse(localStorage.getItem("drafts") || "[]");
}
function saveDraft(d) {
  let drafts = loadDrafts();
  drafts.push(d);
  localStorage.setItem("drafts", JSON.stringify(drafts));
}
function deleteDraft(i) {
  let drafts = loadDrafts();
  drafts.splice(i, 1);
  localStorage.setItem("drafts", JSON.stringify(drafts));
}
function continueDraft(i) {
  let draft = loadDrafts()[i];
  localStorage.setItem("activeDraft", JSON.stringify(draft));
  loadPage("new");
}

// ====== Page Loader ======
async function loadPage(page) {
  let content = document.getElementById("content");

  // ---- HOME ----
  if (page === "home") {
    let drafts = loadDrafts();
    let html = "<h3>Home</h3>";

    // Drafts
    html += "<h4>Draft Applications</h4>";
    if (drafts.length > 0) {
      html += "<div class='card-container'>";
      drafts.forEach((d,i)=>{
        html += `<div class="card">
          <h5>${d.loan_type}</h5>
          <p><strong>Applicant:</strong> ${d.applicants[0].name}</p>
          <div class="card-actions">
            <button class="btn" onclick="continueDraft(${i})">Continue</button>
            <button class="btn" onclick="deleteDraft(${i}); loadPage('home')">Delete</button>
          </div>
        </div>`;
      });
      html += "</div>";
    } else html += "<p>No Draft Applications.</p>";

    // Latest Apps
    html += "<h4>Latest Applications</h4><div id='latestApps' class='card-container'>Loading...</div>";
    content.innerHTML = html;

    try {
      let res = await fetch(API_BASE + "/applications/?limit=5");
      let apps = await res.json();
      let la = apps.map(a=>`
        <div class="card" onclick="viewDetails('${a.id}')">
          <h5>${a.loan_type}</h5>
          <p><strong>ID:</strong> ${a.id}</p>
        </div>
      `).join("");
      document.getElementById("latestApps").innerHTML = la || "<p>No applications yet.</p>";
    } catch(e) {
      document.getElementById("latestApps").innerHTML = "<p>Failed to load.</p>";
    }
  }

  // ---- NEW APPLICATION ----
  if (page === "new") {
    let draft = JSON.parse(localStorage.getItem("activeDraft") || "null");
    localStorage.removeItem("activeDraft");

    content.innerHTML = `
      <h3>New Application</h3>
      <form id="newAppForm">
        <div id="step1" class="step">
          <label>Loan Type: 
            <select name="loan_type" required>
              <option>Home Loan</option>
              <option>Personal Loan</option>
              <option>Loan Against Property</option>
              <option>Loan Transfer</option>
              <option>Car Loan</option>
            </select>
          </label><br>
          <label>Application Type: 
            <select id="appType">
              <option value="individual">Individual</option>
              <option value="joint">Joint</option>
            </select>
          </label><br>
          <div id="jointCountContainer" class="hidden">
            <label>Number of Applicants: <input type="number" id="jointCount" min="2" max="4"></label>
          </div>
          <button type="button" class="btn" onclick="nextStep(1)">Next</button>
        </div>
        <div id="step2" class="step hidden"></div>
        <div id="step3" class="step hidden"></div>
      </form>
    `;

    if (draft) {
      document.querySelector("[name=loan_type]").value = draft.loan_type;
    }

    document.getElementById("appType").onchange = e=>{
      document.getElementById("jointCountContainer").classList.toggle("hidden", e.target.value!=="joint");
    };
  }

  // ---- VIEW APPLICATIONS ----
  if (page === "view") {
    content.innerHTML = `
      <h3>View Applications</h3>
      <form id="searchForm">
        <label>Search by Applicant Name: <input name="q"></label>
        <button type="submit" class="btn">Search</button>
      </form>
      <div id="results"></div>
    `;

    document.getElementById("searchForm").onsubmit = async e=>{
      e.preventDefault();
      let q = e.target.q.value;
      let res = await fetch(API_BASE + "/applications/?q="+q);
      let apps = await res.json();
      let html = "<table><tr><th>ID</th><th>Loan Type</th><th>Action</th></tr>";
      apps.forEach(a=>{
        html += `<tr><td>${a.id}</td><td>${a.loan_type}</td>
          <td><button class="btn" onclick="viewDetails('${a.id}')">View</button></td></tr>`;
      });
      html += "</table>";
      document.getElementById("results").innerHTML = html;
    };
  }

  // ---- EDIT APPLICATION ----
  if (page === "edit") {
    content.innerHTML = `
      <h3>Edit Application</h3>
      <form id="editSearchForm">
        <label>Application ID: <input name="appId" required></label>
        <button class="btn">Load</button>
      </form>
      <div id="editFormContainer"></div>
    `;

    document.getElementById("editSearchForm").onsubmit = async e=>{
      e.preventDefault();
      let id = e.target.appId.value;
      let res = await fetch(API_BASE + "/applications/"+id);
      if (!res.ok) return alert("Not found");
      let app = await res.json();
      document.getElementById("editFormContainer").innerHTML = `
        <form id="editForm">
          <label>Loan Type: <input name="loan_type" value="${app.loan_type}"></label><br>
          <button class="btn">Save</button>
        </form>
      `;
      document.getElementById("editForm").onsubmit = async ev=>{
        ev.preventDefault();
        let data = {loan_type: ev.target.loan_type.value};
        let res2 = await fetch(API_BASE+"/applications/"+id, {
          method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)
        });
        if (res2.ok) alert("Updated!"); else alert("Failed");
      };
    };
  }

  // ---- DELETE APPLICATION ----
  if (page === "delete") {
    content.innerHTML = `
      <h3>Delete Application</h3>
      <form id="deleteAppForm">
        <label>Application ID: <input name="appId" required></label>
        <button class="btn">Delete</button>
      </form>
    `;
    document.getElementById("deleteAppForm").onsubmit = async e=>{
      e.preventDefault();
      let id = e.target.appId.value;
      if (!confirm("Delete "+id+"?")) return;
      let res = await fetch(API_BASE+"/applications/"+id,{method:"DELETE"});
      if (res.ok) { alert("Deleted"); loadPage("view"); }
      else alert("Failed");
    };
  }
}

// ====== Helpers ======
async function viewDetails(id) {
  let res = await fetch(API_BASE+"/applications/"+id);
  if (!res.ok) return alert("Not found");
  let app = await res.json();
  let html = `<h3>Application ${id}</h3>
    <p><strong>Loan Type:</strong> ${app.loan_type}</p>
    <pre>${JSON.stringify(app,null,2)}</pre>`;
  openModal(html);
}

// ====== Init ======
window.onload = ()=> loadPage("home");
