const API_BASE = "https://loan-portal-qlow.onrender.com"; // set after deploy

// ---- Clock ----
function updateClock(){document.getElementById("clock").innerText=new Date().toLocaleString();}
setInterval(updateClock,1000); updateClock();

// ---- Draft Handling ----
function saveDraft(draft) {
  let drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
  drafts.push(draft);
  localStorage.setItem("drafts", JSON.stringify(drafts));
}
function loadDrafts() {
  return JSON.parse(localStorage.getItem("drafts") || "[]");
}
function deleteDraft(index) {
  let drafts = loadDrafts();
  drafts.splice(index,1);
  localStorage.setItem("drafts", JSON.stringify(drafts));
}

// ---- Page Router ----
function loadPage(page) {
  if (page === "home") {
    let drafts = loadDrafts();
    let html = "<h3>Home</h3>";

    // Draft Applications
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
    } else {
      html += "<p>No Draft Applications.</p>";
    }

    // Latest Applications
    html += "<h4>Latest Applications</h4><div id='latestApps' class='card-container'>Loading...</div>";
    document.getElementById("content").innerHTML = html;

    fetch(API_BASE + "/applications?limit=5")
      .then(r=>r.json())
      .then(apps=>{
        let la = apps.map(a=>`
          <div class="card" onclick="viewDetails('${a.id}')">
            <h5>${a.loan_type}</h5>
            <p><strong>ID:</strong> ${a.id}</p>
          </div>
        `).join("");
        document.getElementById("latestApps").innerHTML = la || "<p>No applications yet.</p>";
      });
  }

  if (page === "new") {
    document.getElementById("content").innerHTML = `
      <h3>New Application</h3>
      <div class="step" id="step1">
        <h4>Step 1: Applicant Details</h4>
        <form id="appDetailsForm">
          <label>Loan Type:
            <select name="loan_type" required>
              <option value="">Select...</option>
              <option value="Home Loan">Home Loan</option>
              <option value="Personal Loan">Personal Loan</option>
              <option value="Car Loan">Car Loan</option>
            </select>
          </label><br>
          <label>Applicant Name: <input name="name" required></label><br>
          <label>Email: <input type="email" name="email" required></label><br>
          <label>Phone: <input type="tel" name="phone" required></label><br>
          <label>Gender:
            <select name="gender" required>
              <option value="">Select...</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </label><br>
          <label>Employment:
            <select name="employment" required>
              <option value="">Select...</option>
              <option value="Salaried">Salaried</option>
              <option value="Self Employed">Self Employed</option>
            </select>
          </label><br>
          <label>PAN: <input name="pan" required></label><br>
          <label>Aadhaar: <input name="aadhaar" required></label><br>
          <button type="submit" class="btn">Next</button>
          <button type="button" class="btn" onclick="saveDraftFromForm()">Save Draft</button>
        </form>
      </div>
      <div class="step hidden" id="step2">
        <h4>Step 2: Upload Documents</h4>
        <form id="docUploadForm" enctype="multipart/form-data">
          <label>Upload PAN + Aadhaar + Supporting Docs:</label><br>
          <input type="file" name="files" multiple required><br>
          <button type="submit" class="btn">Next</button>
        </form>
      </div>
      <div class="step hidden" id="step3">
        <h4>Step 3: Preview & Submit</h4>
        <div id="previewBox"></div>
        <button onclick="submitApplication()" class="btn">Submit</button>
      </div>
    `;
    handleNewApplicationForm();
  }

  if (page === "view") {
    fetch(API_BASE + "/applications")
      .then(r=>r.json())
      .then(apps=>{
        let html = "<h3>Applications</h3><table><tr><th>ID</th><th>Loan Type</th><th>Action</th></tr>";
        apps.forEach(a=>{
          html += `<tr><td>${a.id}</td><td>${a.loan_type}</td>
          <td><button onclick="viewDetails('${a.id}')">View</button></td></tr>`;
        });
        html += "</table>";
        document.getElementById("content").innerHTML = html;
      });
  }

  if (page === "edit") {
    document.getElementById("content").innerHTML = `
      <h3>Edit Application</h3>
      <form id="searchAppForm">
        <label>Enter Application ID: <input name="appId" required></label>
        <button type="submit" class="btn">Search</button>
      </form>
      <div id="editFormBox"></div>
    `;
    document.getElementById("searchAppForm").onsubmit = async (e) => {
      e.preventDefault();
      const appId = e.target.appId.value.trim();
      let res = await fetch(API_BASE + "/applications/" + appId);
      if (!res.ok) { alert("Application not found"); return; }
      let app = await res.json();
      let a = app.applicants[0];
      document.getElementById("editFormBox").innerHTML = `
        <form id="editAppForm">
          <input type="hidden" name="appId" value="${appId}">
          <label>Loan Type: <input name="loan_type" value="${app.loan_type}"></label><br>
          <label>Name: <input name="name" value="${a.name}" required></label><br>
          <label>Email: <input type="email" name="email" value="${a.email}" required></label><br>
          <label>Phone: <input type="tel" name="phone" value="${a.phone}" required></label><br>
          <label>Gender:
            <select name="gender" required>
              <option ${a.gender==="Male"?"selected":""}>Male</option>
              <option ${a.gender==="Female"?"selected":""}>Female</option>
            </select>
          </label><br>
          <label>Employment:
            <select name="employment" required>
              <option ${a.employment==="Salaried"?"selected":""}>Salaried</option>
              <option ${a.employment==="Self Employed"?"selected":""}>Self Employed</option>
            </select>
          </label><br>
          <label>PAN: <input name="pan" value="${a.pan}" required></label><br>
          <label>Aadhaar: <input name="aadhaar" value="${a.aadhaar}" required></label><br>
          <h4>Upload New Documents (optional)</h4>
          <input type="file" name="files" multiple><br>
          <button type="submit" class="btn">Update</button>
        </form>
      `;
      document.getElementById("editAppForm").onsubmit = async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.target);
        const appId = f.get("appId");
        const payload = {
          loan_type: f.get("loan_type"),
          applicants: [{
            name: f.get("name"),
            email: f.get("email"),
            phone: f.get("phone"),
            gender: f.get("gender"),
            employment: f.get("employment"),
            pan: f.get("pan"),
            aadhaar: f.get("aadhaar")
          }]
        };
        await fetch(API_BASE + "/applications/" + appId, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        });
        if (f.getAll("files")[0].size > 0) {
          const fd = new FormData();
          fd.append("doc_type","update");
          fd.append("applicant_index",0);
          for (let file of f.getAll("files")) fd.append("files", file);
          await fetch(API_BASE + `/applications/${appId}/documents`, { method: "POST", body: fd });
        }
        alert("Application updated successfully!");
        loadPage("view");
      };
    };
  }

  if (page === "delete") {
    document.getElementById("content").innerHTML = `
      <h3>Delete Application</h3>
      <form id="deleteAppForm">
        <label>Enter Application ID: <input name="appId" required></label>
        <button type="submit" class="btn">Delete</button>
      </form>
    `;
    document.getElementById("deleteAppForm").onsubmit = async (e) => {
      e.preventDefault();
      const appId = e.target.appId.value.trim();
      if (!confirm("Delete Application " + appId + "?")) return;
      let res = await fetch(API_BASE + "/applications/" + appId, { method: "DELETE" });
      if (res.ok) { alert("Application deleted"); loadPage("view"); }
      else alert("Failed to delete");
    };
  }
}

// ---- New Application State ----
let newAppData = {};

function handleNewApplicationForm() {
  document.getElementById("appDetailsForm").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    newAppData = {
      loan_type: f.get("loan_type"),
      applicants: [{
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        gender: f.get("gender"),
        employment: f.get("employment"),
        pan: f.get("pan"),
        aadhaar: f.get("aadhaar")
      }]
    };
    document.getElementById("step1").classList.add("hidden");
    document.getElementById("step2").classList.remove("hidden");
  };

  document.getElementById("docUploadForm").onsubmit = (e) => {
    e.preventDefault();
    const files = e.target.files.files;
    newAppData.files = files;
    document.getElementById("step2").classList.add("hidden");
    document.getElementById("step3").classList.remove("hidden");
    document.getElementById("previewBox").innerHTML = `
      <pre>${JSON.stringify(newAppData,null,2)}</pre>
      <p>Files: ${Array.from(files).map(f=>f.name).join(", ")}</p>
    `;
  };
}

function saveDraftFromForm() {
  const f = new FormData(document.getElementById("appDetailsForm"));
  const draft = {
    loan_type: f.get("loan_type"),
    applicants: [{
      name: f.get("name"),
      email: f.get("email"),
      phone: f.get("phone"),
      gender: f.get("gender"),
      employment: f.get("employment"),
      pan: f.get("pan"),
      aadhaar: f.get("aadhaar")
    }]
  };
  saveDraft(draft);
  alert("Draft saved!");
}

function continueDraft(index) {
  let drafts = loadDrafts();
  newAppData = drafts[index];
  deleteDraft(index);
  loadPage("new");
  // Pre-fill form after short delay
  setTimeout(()=>{
    const f = document.getElementById("appDetailsForm");
    f.loan_type.value = newAppData.loan_type;
    f.name.value = newAppData.applicants[0].name;
    f.email.value = newAppData.applicants[0].email;
    f.phone.value = newAppData.applicants[0].phone;
    f.gender.value = newAppData.applicants[0].gender;
    f.employment.value = newAppData.applicants[0].employment;
    f.pan.value = newAppData.applicants[0].pan;
    f.aadhaar.value = newAppData.applicants[0].aadhaar;
  },100);
}

async function submitApplication() {
  let res = await fetch(API_BASE + "/applications/", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      loan_type: newAppData.loan_type,
      applicants: newAppData.applicants
    })
  });
  let data = await res.json();
  const appId = data.id;

  const fd = new FormData();
  fd.append("doc_type","general");
  fd.append("applicant_index",0);
  for (let f of newAppData.files) fd.append("files", f);

  await fetch(API_BASE + `/applications/${appId}/documents`, { method:"POST", body:fd });

  alert("Application submitted! ID: " + appId);
  loadPage("view");
}

// ---- Modal ----
function viewDetails(id) {
  fetch(API_BASE + "/applications/" + id)
    .then(r=>r.json())
    .then(data=>{
      document.getElementById("modalBody").innerHTML =
        `<h3>Application ${id}</h3><pre>${JSON.stringify(data,null,2)}</pre>
         <button onclick="viewReport('${id}')">View Report</button>`;
      document.getElementById("modal").style.display = "flex";
    });
}
function viewReport(id) {
  fetch(API_BASE + `/applications/${id}/report`)
    .then(r=>r.json())
    .then(rep=>{
      document.getElementById("modalBody").innerHTML +=
        `<h4>Report</h4><pre>${rep.report_text}</pre>
         <a href="${rep.report_pdf_url}" target="_blank">Download PDF</a>`;
    });
}
function closeModal(){document.getElementById("modal").style.display="none";}

// ---- Default Page ----
window.onload = () => { loadPage("home"); };



