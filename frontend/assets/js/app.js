const API_BASE = "https://your-backend.onrender.com"; // set after deploy

// Clock
function updateClock() {
  document.getElementById("clock").innerText = new Date().toLocaleString();
}
setInterval(updateClock, 1000);
updateClock();

// Modal
function showReport(text) {
  document.getElementById("reportText").innerText = text;
  document.getElementById("reportModal").style.display = "block";
}
function closeModal() {
  document.getElementById("reportModal").style.display = "none";
}

// Page loader
function loadPage(page) {
  if (page === "home") {
    document.getElementById("content").innerHTML = "<h3>Home</h3><p>Drafts + recent apps will be shown here.</p>";
  }
  if (page === "new") renderNewApplicationForm();
  if (page === "view") renderViewApplications();
  if (page === "edit") renderEditApplication();
  if (page === "delete") renderDeleteApplication();
}

// ---- New Application ----
function renderNewApplicationForm() {
  document.getElementById("content").innerHTML = `
    <h3>New Application</h3>
    <form id="step1">
      <label>Loan Type: <input name="loan_type" required></label><br>
      <label>Name: <input name="name" required></label><br>
      <label>Email: <input name="email" required></label><br>
      <button type="submit">Next</button>
    </form>
    <div id="uploadArea"></div>
  `;
  document.getElementById("step1").onsubmit = async (e) => {
    e.preventDefault();
    let f = new FormData(e.target);
    let payload = {
      loan_type: f.get("loan_type"),
      applicants: [{
        name: f.get("name"),
        email: f.get("email"),
        gender: "", employment: "", phone: "", pan: "", aadhaar: ""
      }]
    };
    let res = await fetch(API_BASE + "/applications/", {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload)
    });
    let data = await res.json();
    showUploadDocsForm(data.id);
  };
}

function showUploadDocsForm(appId) {
  document.getElementById("uploadArea").innerHTML = `
    <h4>Upload Documents</h4>
    <form id="docForm" enctype="multipart/form-data">
      <label>PAN: <input type="file" name="pan" required></label><br>
      <label>Aadhaar: <input type="file" name="aadhaar" required></label><br>
      <button type="submit">Submit</button>
    </form>`;
  document.getElementById("docForm").onsubmit = async (e) => {
    e.preventDefault();
    let fd = new FormData();
    fd.append("doc_type","PAN");
    fd.append("files", e.target.pan.files[0]);
    await fetch(API_BASE+`/applications/${appId}/documents`,{method:"POST",body:fd});

    let fd2 = new FormData();
    fd2.append("doc_type","Aadhaar");
    fd2.append("files", e.target.aadhaar.files[0]);
    await fetch(API_BASE+`/applications/${appId}/documents`,{method:"POST",body:fd2});

    let r = await fetch(API_BASE+`/applications/${appId}/report`);
    let rep = await r.json();
    showReport(rep.report_text);
  };
}

// ---- View Applications ----
function renderViewApplications() {
  fetch(API_BASE + "/applications")
    .then(r => r.json())
    .then(apps => {
      let html = "<h3>Applications</h3><table><tr><th>ID</th><th>Loan Type</th><th>Action</th></tr>";
      apps.forEach(a => {
        html += `<tr><td>${a.id}</td><td>${a.loan_type||''}</td>
          <td><button onclick="viewDetails('${a.id}')">View</button></td></tr>`;
      });
      html += "</table>";
      document.getElementById("content").innerHTML = html;
    });
}

async function viewDetails(id) {
  let res = await fetch(API_BASE + "/applications/" + id);
  let data = await res.json();
  let r = await fetch(API_BASE + `/applications/${id}/report`);
  let rep = await r.json();
  showReport(rep.report_text || "No report yet");
}

// ---- Edit Application ----
function renderEditApplication() {
  document.getElementById("content").innerHTML = `
    <h3>Edit Application</h3>
    <form id="editSearch">
      <label>Application ID: <input name="id" required></label>
      <button type="submit">Search</button>
    </form>
    <div id="editFormArea"></div>`;
  document.getElementById("editSearch").onsubmit = async (e) => {
    e.preventDefault();
    let id = e.target.id.value;
    let res = await fetch(API_BASE + "/applications/" + id);
    if (res.ok) {
      let app = await res.json();
      renderEditForm(app);
    } else alert("Not found");
  };
}

function renderEditForm(app) {
  let html = `<h4>Edit ${app.id}</h4>
    <form id="editForm">
      <label>Loan Type: <input name="loan_type" value="${app.loan_type||''}"></label><br>
      <label>Name: <input name="name" value="${app.applicants[0].name||''}"></label><br>
      <label>Email: <input name="email" value="${app.applicants[0].email||''}"></label><br>
      <button type="submit">Save</button>
    </form>`;
  document.getElementById("editFormArea").innerHTML = html;
  document.getElementById("editForm").onsubmit = async (e) => {
    e.preventDefault();
    let f = new FormData(e.target);
    let payload = {
      loan_type: f.get("loan_type"),
      applicants: [{...app.applicants[0], name:f.get("name"), email:f.get("email")}]
    };
    await fetch(API_BASE+"/applications/"+app.id,{
      method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    let r = await fetch(API_BASE+`/applications/${app.id}/report`);
    let rep = await r.json();
    showReport(rep.report_text);
  };
}

// ---- Delete Application ----
function renderDeleteApplication() {
  document.getElementById("content").innerHTML = `
    <h3>Delete Application</h3>
    <form id="deleteForm">
      <label>Application ID: <input name="id" required></label>
      <button type="submit">Delete</button>
    </form>`;
  document.getElementById("deleteForm").onsubmit = async (e) => {
    e.preventDefault();
    let id = e.target.id.value;
    let res = await fetch(API_BASE + "/applications/" + id,{method:"DELETE"});
    if (res.ok) alert("Deleted"); else alert("Not found");
  };
}

// Start
loadPage("home");
