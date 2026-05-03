// Mini SIS - Beginner JS
// Goal: keep functions small + readable. Regular functions (no arrow functions).

var db = null;      // SQLite database object (sql.js)
var SQL = null;     // sql.js library

// -------------------- 1) Page (tab) switching --------------------
function showPage(pageName) {
  hideAllPages();
  removeActiveTabs();

  if (pageName === "registrar") {
    document.getElementById("pageRegistrar").classList.remove("hidden");
    document.getElementById("tabBtnRegistrar").classList.add("active");
  }
  if (pageName === "student") {
    document.getElementById("pageStudent").classList.remove("hidden");
    document.getElementById("tabBtnStudent").classList.add("active");
  }
  if (pageName === "faculty") {
    document.getElementById("pageFaculty").classList.remove("hidden");
    document.getElementById("tabBtnFaculty").classList.add("active");
  }
  if (pageName === "reports") {
    document.getElementById("pageReports").classList.remove("hidden");
    document.getElementById("tabBtnReports").classList.add("active");
  }
}

function hideAllPages() {
  document.getElementById("pageRegistrar").classList.add("hidden");
  document.getElementById("pageStudent").classList.add("hidden");
  document.getElementById("pageFaculty").classList.add("hidden");
  document.getElementById("pageReports").classList.add("hidden");
}

function removeActiveTabs() {
  document.getElementById("tabBtnRegistrar").classList.remove("active");
  document.getElementById("tabBtnStudent").classList.remove("active");
  document.getElementById("tabBtnFaculty").classList.remove("active");
  document.getElementById("tabBtnReports").classList.remove("active");
}

// -------------------- 2) Status helper --------------------
function setStatus(message, isOk) {
  var box = document.getElementById("statusText");
  if (isOk) box.innerHTML = "<span class='ok'>" + message + "</span>";
  else box.innerHTML = "<span class='bad'>" + message + "</span>";
}

// -------------------- 3) SQL helpers --------------------
function run(sql, params) {
  if (!params) params = [];
  db.run(sql, params);
}

function getAll(sql, params) {
  if (!params) params = [];
  var result = db.exec(sql, params);
  if (result.length === 0) return { columns: [], rows: [] };
  return { columns: result[0].columns, rows: result[0].values };
}

function makeTableHTML(columns, rows) {
  if (columns.length === 0) return "<div class='small'>No data.</div>";

  var html = "<table><thead><tr>";
  for (var i = 0; i < columns.length; i++) {
    html += "<th>" + escapeHTML(columns[i]) + "</th>";
  }
  html += "</tr></thead><tbody>";

  for (var r = 0; r < rows.length; r++) {
    html += "<tr>";
    for (var c = 0; c < columns.length; c++) {
      html += "<td>" + escapeHTML(String(rows[r][c])) + "</td>";
    }
    html += "</tr>";
  }

  html += "</tbody></table>";
  return html;
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">");
}

// -------------------- 4) Database schema (tables + keys) --------------------
function createSchema() {
  run("PRAGMA foreign_keys = ON;");

  run("CREATE TABLE IF NOT EXISTS students (" +
      " student_id INTEGER PRIMARY KEY AUTOINCREMENT," +
      " name TEXT NOT NULL," +
      " email TEXT UNIQUE," +
      " major TEXT" +
      ");");

  run("CREATE TABLE IF NOT EXISTS faculty (" +
      " faculty_id INTEGER PRIMARY KEY AUTOINCREMENT," +
      " name TEXT NOT NULL," +
      " email TEXT UNIQUE," +
      " department TEXT" +
      ");");

  run("CREATE TABLE IF NOT EXISTS courses (" +
      " course_id INTEGER PRIMARY KEY AUTOINCREMENT," +
      " title TEXT NOT NULL," +
      " credits INTEGER NOT NULL DEFAULT 3," +
      " capacity INTEGER NOT NULL DEFAULT 30," +
      " faculty_id INTEGER," +
      " FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)" +
      ");");

  // Bridge table for many-to-many: students <-> courses
  run("CREATE TABLE IF NOT EXISTS enrollments (" +
      " enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT," +
      " student_id INTEGER NOT NULL," +
      " course_id INTEGER NOT NULL," +
      " term TEXT NOT NULL," +
      " grade TEXT," +
      " FOREIGN KEY (student_id) REFERENCES students(student_id)," +
      " FOREIGN KEY (course_id) REFERENCES courses(course_id)," +
      " UNIQUE(student_id, course_id, term)" +
      ");");
}

// Add sample data only if tables are empty (helps beginners test quickly)
function seedDataIfEmpty() {
  var r = getAll("SELECT COUNT(*) AS c FROM students;");
  var count = 0;
  if (r.rows.length > 0) count = r.rows[0][0];

  if (count === 0) {
    run("INSERT INTO students (name,email,major) VALUES" +
        " ('Ana Kim','ana@school.edu','CS')," +
        " ('Ben Lee','ben@school.edu','MIS')," +
        " ('Cara Patel','cara@school.edu','Biology');");

    run("INSERT INTO faculty (name,email,department) VALUES" +
        " ('Dr. Smith','smith@school.edu','CS')," +
        " ('Dr. Jones','jones@school.edu','Business');");

    run("INSERT INTO courses (title,credits,capacity,faculty_id) VALUES" +
        " ('Intro to Databases',3,2,1)," +
        " ('Web Development 1',3,30,1)," +
        " ('Business Analytics',3,25,2);");

    run("INSERT INTO enrollments (student_id,course_id,term,grade) VALUES" +
        " (1,1,'Fall 2025',NULL)," +
        " (2,1,'Fall 2025',NULL);");
  }
}

// -------------------- 5) UI: dropdowns --------------------
function fillSelect(selectId, rows) {
  var sel = document.getElementById(selectId);
  sel.innerHTML = "";
  for (var i = 0; i < rows.length; i++) {
    var opt = document.createElement("option");
    opt.value = rows[i][0];
    opt.textContent = rows[i][1];
    sel.appendChild(opt);
  }
}

function refreshDropdowns() {
  var students = getAll("SELECT student_id, name FROM students ORDER BY name;");
  fillSelect("studentSelect", students.rows);
  fillSelect("reportStudentSelect", students.rows);

  var faculty = getAll("SELECT faculty_id, name FROM faculty ORDER BY name;");
  fillSelect("facultySelect", faculty.rows);
  fillSelect("courseFacultySelect", faculty.rows);

  refreshFacultyCourseSelect(); // depends on selected faculty
}

// -------------------- 6) Registrar actions --------------------
function addStudent() {
  var name = document.getElementById("studentName").value.trim();
  var email = document.getElementById("studentEmail").value.trim();
  var major = document.getElementById("studentMajor").value.trim();

  if (name === "") { setStatus("Student name is required.", false); return; }

  try {
    run("INSERT INTO students (name,email,major) VALUES (?,?,?);",
        [name, email || null, major || null]);
    setStatus("Student added.", true);
    document.getElementById("studentName").value = "";
    document.getElementById("studentEmail").value = "";
    document.getElementById("studentMajor").value = "";
    refreshAll();
  } catch (e) {
    setStatus("Add student failed (maybe duplicate email).", false);
  }
}

function addFaculty() {
  var name = document.getElementById("facultyName").value.trim();
  var email = document.getElementById("facultyEmail").value.trim();
  var dept = document.getElementById("facultyDept").value.trim();

  if (name === "") { setStatus("Faculty name is required.", false); return; }

  try {
    run("INSERT INTO faculty (name,email,department) VALUES (?,?,?);",
        [name, email || null, dept || null]);
    setStatus("Faculty added.", true);
    document.getElementById("facultyName").value = "";
    document.getElementById("facultyEmail").value = "";
    document.getElementById("facultyDept").value = "";
    refreshAll();
  } catch (e) {
    setStatus("Add faculty failed (maybe duplicate email).", false);
  }
}

function addCourse() {
  var title = document.getElementById("courseTitle").value.trim();
  var credits = parseInt(document.getElementById("courseCredits").value, 10);
  var cap = parseInt(document.getElementById("courseCapacity").value, 10);
  var facultyId = parseInt(document.getElementById("courseFacultySelect").value, 10);

  if (title === "") { setStatus("Course title is required.", false); return; }
  if (isNaN(credits) || credits <= 0) credits = 3;
  if (isNaN(cap) || cap <= 0) cap = 30;

  run("INSERT INTO courses (title,credits,capacity,faculty_id) VALUES (?,?,?,?);",
      [title, credits, cap, facultyId || null]);

  setStatus("Course added.", true);
  document.getElementById("courseTitle").value = "";
  refreshAll();
}

// -------------------- 7) Student actions: enroll/drop --------------------
function enroll(studentId, courseId) {
  var term = document.getElementById("studentTerm").value.trim();
  if (term === "") term = "Fall 2025";

  // seat check
  var seatInfo = getAll(
    "SELECT c.capacity - COUNT(e.enrollment_id) AS seats_left " +
    "FROM courses c " +
    "LEFT JOIN enrollments e ON e.course_id=c.course_id AND e.term=? " +
    "WHERE c.course_id=?;",
    [term, courseId]
  );

  var seatsLeft = seatInfo.rows[0][0];
  if (seatsLeft <= 0) {
    setStatus("Cannot enroll: course is full.", false);
    return;
  }

  try {
    run("INSERT INTO enrollments (student_id, course_id, term, grade) VALUES (?,?,?,NULL);",
        [studentId, courseId, term]);
    setStatus("Enrolled successfully.", true);
    refreshAll();
  } catch (e) {
    setStatus("Enroll failed: maybe already enrolled.", false);
  }
}

function dropCourse(studentId, courseId) {
  var term = document.getElementById("studentTerm").value.trim();
  if (term === "") term = "Fall 2025";

  run("DELETE FROM enrollments WHERE student_id=? AND course_id=? AND term=?;",
      [studentId, courseId, term]);

  setStatus("Dropped successfully.", true);
  refreshAll();
}

// -------------------- 8) Faculty actions: grade submission --------------------
function refreshFacultyCourseSelect() {
  var facultyId = parseInt(document.getElementById("facultySelect").value, 10);
  var courses = getAll("SELECT course_id, title FROM courses WHERE faculty_id=? ORDER BY title;", [facultyId]);
  fillSelect("facultyCourseSelect", courses.rows);
}

function setGrade(studentId, courseId) {
  var term = document.getElementById("facultyTerm").value.trim();
  if (term === "") term = "Fall 2025";

  var g = prompt("Enter grade (A, B, C, D, F):");
  if (!g) return;

  g = g.trim().toUpperCase();
  if ("ABCDF".indexOf(g) === -1) {
    setStatus("Invalid grade. Use A, B, C, D, or F.", false);
    return;
  }

  run("UPDATE enrollments SET grade=? WHERE student_id=? AND course_id=? AND term=?;",
      [g, studentId, courseId, term]);

  setStatus("Grade saved.", true);
  refreshAll();
}

// -------------------- 9) Render (show data on screen) --------------------
function refreshRegistrarPreview() {
  var html = "";
  var s = getAll("SELECT student_id, name, email, major FROM students ORDER BY student_id;");
  html += "<h4>Students</h4>" + makeTableHTML(s.columns, s.rows);

  var f = getAll("SELECT faculty_id, name, email, department FROM faculty ORDER BY faculty_id;");
  html += "<h4>Faculty</h4>" + makeTableHTML(f.columns, f.rows);

  var c = getAll("SELECT course_id, title, credits, capacity, faculty_id FROM courses ORDER BY course_id;");
  html += "<h4>Courses</h4>" + makeTableHTML(c.columns, c.rows);

  var e = getAll("SELECT enrollment_id, student_id, course_id, term, COALESCE(grade,'') AS grade FROM enrollments ORDER BY enrollment_id;");
  html += "<h4>Enrollments</h4>" + makeTableHTML(e.columns, e.rows);

  document.getElementById("registrarPreview").innerHTML = html;
}

function refreshStudentPage() {
  var studentId = parseInt(document.getElementById("studentSelect").value, 10);
  var term = document.getElementById("studentTerm").value.trim();
  if (term === "") term = "Fall 2025";

  // Available courses + seats
  var courses = getAll(
    "SELECT c.course_id, c.title, c.capacity, (c.capacity - COUNT(e.enrollment_id)) AS seats_left " +
    "FROM courses c " +
    "LEFT JOIN enrollments e ON e.course_id=c.course_id AND e.term=? " +
    "GROUP BY c.course_id ORDER BY c.title;",
    [term]
  );

  var html = "<table><thead><tr><th>Course</th><th>Capacity</th><th>Seats Left</th><th>Action</th></tr></thead><tbody>";
  for (var i = 0; i < courses.rows.length; i++) {
    var courseId = courses.rows[i][0];
    var title = courses.rows[i][1];
    var cap = courses.rows[i][2];
    var seats = courses.rows[i][3];

    html += "<tr>";
    html += "<td>" + escapeHTML(title) + "</td>";
    html += "<td>" + cap + "</td>";
    html += "<td>" + seats + "</td>";

    if (seats <= 0) {
      html += "<td><span class='bad'>Full</span></td>";
    } else {
      html += "<td><button type='button' onclick='enroll(" + studentId + "," + courseId + ")'>Enroll</button></td>";
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  document.getElementById("availableCoursesBox").innerHTML = html;

  // Student schedule + drop buttons
  var schedule = getAll(
    "SELECT c.course_id, c.title, COALESCE(e.grade,'(not graded)') AS grade " +
    "FROM enrollments e JOIN courses c ON c.course_id=e.course_id " +
    "WHERE e.student_id=? AND e.term=? ORDER BY c.title;",
    [studentId, term]
  );

  var sch = "<table><thead><tr><th>Course</th><th>Grade</th><th>Action</th></tr></thead><tbody>";
  for (var j = 0; j < schedule.rows.length; j++) {
    var cid = schedule.rows[j][0];
    var t = schedule.rows[j][1];
    var g = schedule.rows[j][2];

    sch += "<tr>";
    sch += "<td>" + escapeHTML(t) + "</td>";
    sch += "<td>" + escapeHTML(g) + "</td>";
    sch += "<td><button type='button' onclick='dropCourse(" + studentId + "," + cid + ")'>Drop</button></td>";
    sch += "</tr>";
  }
  if (schedule.rows.length === 0) {
    sch += "<tr><td colspan='3' class='small'>No courses enrolled.</td></tr>";
  }
  sch += "</tbody></table>";

  document.getElementById("studentScheduleBox").innerHTML = sch;
}

function refreshFacultyPage() {
  var facultyId = parseInt(document.getElementById("facultySelect").value, 10);
  var term = document.getElementById("facultyTerm").value.trim();
  if (term === "") term = "Fall 2025";

  // Courses taught by faculty
  var courses = getAll("SELECT course_id, title, credits, capacity FROM courses WHERE faculty_id=? ORDER BY title;", [facultyId]);
  document.getElementById("facultyCoursesBox").innerHTML = makeTableHTML(courses.columns, courses.rows);

  // Grade roster for selected course
  var courseId = parseInt(document.getElementById("facultyCourseSelect").value, 10);
  if (!courseId) {
    document.getElementById("gradeRosterBox").innerHTML = "<div class='small'>No course selected.</div>";
    return;
  }

  var roster = getAll(
    "SELECT s.student_id, s.name, COALESCE(e.grade,'') AS grade " +
    "FROM enrollments e JOIN students s ON s.student_id=e.student_id " +
    "WHERE e.course_id=? AND e.term=? ORDER BY s.name;",
    [courseId, term]
  );

  var html = "<table><thead><tr><th>Student</th><th>Grade</th><th>Action</th></tr></thead><tbody>";
  for (var i = 0; i < roster.rows.length; i++) {
    var sid = roster.rows[i][0];
    var name = roster.rows[i][1];
    var grade = roster.rows[i][2] || "(not graded)";

    html += "<tr>";
    html += "<td>" + escapeHTML(name) + "</td>";
    html += "<td>" + escapeHTML(grade) + "</td>";
    html += "<td><button type='button' onclick='setGrade(" + sid + "," + courseId + ")'>Set Grade</button></td>";
    html += "</tr>";
  }
  if (roster.rows.length === 0) {
    html += "<tr><td colspan='3' class='small'>No students enrolled.</td></tr>";
  }
  html += "</tbody></table>";

  document.getElementById("gradeRosterBox").innerHTML = html;
}

function refreshReportsPage() {
  var term = document.getElementById("reportTerm").value.trim();
  if (term === "") term = "Fall 2025";

  // Seats remaining per course
  var seats = getAll(
    "SELECT c.title, c.capacity, (c.capacity - COUNT(e.enrollment_id)) AS seats_left " +
    "FROM courses c LEFT JOIN enrollments e ON e.course_id=c.course_id AND e.term=? " +
    "GROUP BY c.course_id ORDER BY c.title;",
    [term]
  );
  document.getElementById("reportSeatsBox").innerHTML = makeTableHTML(seats.columns, seats.rows);

  // Transcript for selected student
  var studentId = parseInt(document.getElementById("reportStudentSelect").value, 10);
  var transcript = getAll(
    "SELECT c.title, COALESCE(e.grade,'(not graded)') AS grade " +
    "FROM enrollments e JOIN courses c ON c.course_id=e.course_id " +
    "WHERE e.student_id=? AND e.term=? ORDER BY c.title;",
    [studentId, term]
  );
  document.getElementById("reportTranscriptBox").innerHTML = makeTableHTML(transcript.columns, transcript.rows);
}

function refreshAll() {
  refreshDropdowns();
  refreshRegistrarPreview();
  refreshStudentPage();
  refreshFacultyPage();
  refreshReportsPage();
}

// -------------------- 10) Wire up events --------------------
function setupEvents() {
  // Tabs
  document.getElementById("tabBtnRegistrar").onclick = function () { showPage("registrar"); };
  document.getElementById("tabBtnStudent").onclick   = function () { showPage("student"); };
  document.getElementById("tabBtnFaculty").onclick   = function () { showPage("faculty"); };
  document.getElementById("tabBtnReports").onclick   = function () { showPage("reports"); };

  // Registrar buttons
  document.getElementById("btnAddStudent").onclick = function () { addStudent(); };
  document.getElementById("btnAddFaculty").onclick = function () { addFaculty(); };
  document.getElementById("btnAddCourse").onclick  = function () { addCourse(); };

  // Dropdown changes
  document.getElementById("studentSelect").onchange = function () { refreshStudentPage(); };
  document.getElementById("studentTerm").onchange   = function () { refreshStudentPage(); };

  document.getElementById("facultySelect").onchange = function () {
    refreshFacultyCourseSelect();
    refreshFacultyPage();
  };
  document.getElementById("facultyTerm").onchange = function () { refreshFacultyPage(); };
  document.getElementById("facultyCourseSelect").onchange = function () { refreshFacultyPage(); };

  document.getElementById("reportTerm").onchange = function () { refreshReportsPage(); };
  document.getElementById("reportStudentSelect").onchange = function () { refreshReportsPage(); };
}

// -------------------- 11) Start everything --------------------
async function startApp() {
  try {
    // Load sql.js (WASM)
    SQL = await initSqlJs({
      locateFile: function (file) {
        return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/" + file;
      }
    });

    db = new SQL.Database();     // in-memory database (simple for beginners)

    createSchema();
    seedDataIfEmpty();

    setupEvents();
    refreshAll();

    setStatus("Database ready. Use the tabs to test Enroll/Drop/Grades.", true);
  } catch (e) {
    console.log(e);
    setStatus("Database failed to load. Use a local server (not file://).", false);
  }
}

startApp();
