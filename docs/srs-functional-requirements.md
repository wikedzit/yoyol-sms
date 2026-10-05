# YOYOL School Management System: Functional Requirements

- Document: SRS v0.5 (functional requirements only)
- Date: 2026-10-05
- Status: Draft
- Replaces: Section 3 of SRS Draft v0.4
- Related: [features.md](features.md), [ADRs](adr/README.md)

This revision lists only what the system and its users must be able to do. Architecture,
data model, testing and operations stay in the ADRs, the extension specification and
`features.md`.

Wording:

- "The system must be able to..." is behaviour the system performs.
- "The [role] must be able to..." is an action a person performs. Roles are Admin, Teacher,
  Finance officer, Student and Parent. "User" means any signed-in person.
- Required modules (School, Academics, Students, Staff) list create, view, update, remove
  and the management actions around them. Other modules list the same where the action exists.
- Every action is limited to the caller's school and to records they are allowed to see.

## 1. School profile (required)

- **FR-SCH-01** The admin must be able to create a school with name, motto, logo, theme colours, address, phone, email and registration number.
- **FR-SCH-02** The admin must be able to view the school profile.
- **FR-SCH-03** The admin must be able to update any school profile field, including logo and theme colours.
- **FR-SCH-04** The system must be able to apply the school's name, logo and colours across the application.
- **FR-SCH-05** The admin must be able to archive a school. The system must be able to keep its records and block new sign-in for that school.
- **FR-SCH-06** The admin must be able to add a campus with name, code, address, phone, email and a main-campus flag.
- **FR-SCH-07** The admin must be able to view, search and filter campuses of a school.
- **FR-SCH-08** The admin must be able to update a campus.
- **FR-SCH-09** The admin must be able to remove a campus that has no students, staff or classes.
- **FR-SCH-10** The system must be able to keep exactly one main campus per school.

## 2. Identity and access (required)

- **FR-IAM-01** A visitor must be able to create an account with email and password.
- **FR-IAM-02** A user must be able to sign in with email and password and stay signed in across requests.
- **FR-IAM-03** A user must be able to sign out, ending that session immediately.
- **FR-IAM-04** A user must be able to sign out of all devices.
- **FR-IAM-05** The system must be able to store passwords only as adaptive hashes and reject weak passwords.
- **FR-IAM-06** The system must be able to slow and then lock sign-in after repeated failures, and record each lockout.
- **FR-IAM-07** A user must be able to request a password reset without revealing whether the account exists.
- **FR-IAM-08** A user must be able to set a new password from a single-use, expiring reset link.
- **FR-IAM-09** A user must be able to turn on two-factor authentication. The admin must be able to require it for admin and finance roles.
- **FR-IAM-10** A user must be able to view and update their own name, phone, photo and preferred language (English or Swahili).
- **FR-IAM-11** A user must be able to change their own password after confirming the current one.
- **FR-IAM-12** The admin must be able to invite a person by email or phone, choosing a role and an optional staff, student or guardian record.
- **FR-IAM-13** An invited person must be able to accept, set a password and land in the correct school and role.
- **FR-IAM-14** The admin must be able to view members of the school, their roles and their linked records.
- **FR-IAM-15** The admin must be able to change a member's role.
- **FR-IAM-16** The admin must be able to suspend and restore a member's access without deleting their records.
- **FR-IAM-17** The admin must be able to remove a member from the school. The system must be able to keep the underlying staff, student or guardian record.
- **FR-IAM-18** The admin must be able to create, rename and delete custom roles. The system must be able to protect the five built-in roles from deletion.
- **FR-IAM-19** The admin must be able to grant and revoke permissions on a role.
- **FR-IAM-20** The system must be able to refuse any action the caller's role does not permit, even when the screen hides the control.
- **FR-IAM-21** The system must be able to limit a teacher to assigned classes and subjects, a parent to linked students, and a student to their own records.
- **FR-IAM-22** A user who belongs to more than one school must be able to switch the active school.
- **FR-IAM-23** The system must be able to record sign-in, sign-out, permission changes and membership changes in the audit log.

## 3. Academics (required)

### 3.1 Levels, streams, forms and classes

- **FR-ACA-01** The admin must be able to create a level (for example O-Level or A-Level) with a name and description.
- **FR-ACA-02** The admin must be able to view all levels.
- **FR-ACA-03** The admin must be able to rename a level and edit its description.
- **FR-ACA-04** The admin must be able to remove a level that has no streams, classes or subjects.
- **FR-ACA-05** The admin must be able to create a stream under a level, with a name.
- **FR-ACA-06** The admin must be able to view streams of a level.
- **FR-ACA-07** The admin must be able to rename a stream.
- **FR-ACA-08** The admin must be able to remove a stream that has no forms or classes.
- **FR-ACA-09** The admin must be able to create a form under a stream (for example Form 1), with a name and number.
- **FR-ACA-10** The admin must be able to view, rename and remove forms. Removal must be refused while classes exist.
- **FR-ACA-11** The admin must be able to create a class under a form (for example 3A), optionally on a campus.
- **FR-ACA-12** The admin must be able to view classes, filter them by level, stream, form and campus, and open one class with its students and subjects.
- **FR-ACA-13** The admin must be able to rename a class and move it to another campus.
- **FR-ACA-14** The admin must be able to remove a class that has no current enrolment.
- **FR-ACA-15** The system must be able to show how many students are in a class from enrolment records.

### 3.2 Subjects and combinations

- **FR-ACA-16** The admin must be able to create a subject with a name, a unique code, a level and an optional stream.
- **FR-ACA-17** The admin must be able to view, search and filter subjects by level, stream and status.
- **FR-ACA-18** The admin must be able to update a subject's name, code, level, stream and description.
- **FR-ACA-19** The admin must be able to deactivate a subject so it cannot be newly assigned, and reactivate it later.
- **FR-ACA-20** The admin must be able to assign subjects to a class and remove that assignment.
- **FR-ACA-21** The admin must be able to create an A-Level combination, add and remove its subjects, and retire a combination.
- **FR-ACA-22** The system must be able to refuse a duplicate subject code within one school.

### 3.3 Academic years and terms

- **FR-ACA-23** The admin must be able to create an academic year with a name, start date and end date.
- **FR-ACA-24** The admin must be able to view all years and the status of each (upcoming, active, archived).
- **FR-ACA-25** The admin must be able to edit a year's name and dates while it is not archived.
- **FR-ACA-26** The admin must be able to mark one year as active. The system must be able to ensure only one year is active.
- **FR-ACA-27** The admin must be able to archive a year. The system must be able to keep its enrolments, results and payments readable.
- **FR-ACA-28** The system must be able to refuse deletion of a year that has enrolments, results or invoices.
- **FR-ACA-29** The admin must be able to add a term to a year with a name, number, start date and end date.
- **FR-ACA-30** The admin must be able to edit, reorder and remove terms. Removal must be refused when the term has results or attendance.
- **FR-ACA-31** The admin must be able to mark one term as current. The system must be able to ensure only one term is current.

## 4. Students and guardians (required)

### 4.1 Student records

- **FR-STU-01** The admin must be able to register a student with first, middle and last name, gender, date of birth, admission date, campus and optional photo.
- **FR-STU-02** The system must be able to generate a unique admission number, and the admin must be able to enter one instead.
- **FR-STU-03** The admin must be able to set the admission-number format for the school.
- **FR-STU-04** The admin and teacher must be able to view a student list with search, filters (class, campus, status, year) and paging.
- **FR-STU-05** The admin, teacher, linked parent and the student must be able to open a student profile.
- **FR-STU-06** The admin must be able to update a student's personal details, photo and campus.
- **FR-STU-07** The admin must be able to set a student's status to active, suspended, transferred or left.
- **FR-STU-08** The admin must be able to correct an admission number when it has not been used on a report or invoice.
- **FR-STU-09** The system must be able to refuse a second student with the same admission number in one school.
- **FR-STU-10** The admin must be able to export the student list, and import students from a spreadsheet with a validation preview before saving.

### 4.2 Enrolment

- **FR-STU-11** The admin must be able to enrol a student in a class for an academic year.
- **FR-STU-12** The admin must be able to view a student's class for every year, including past years.
- **FR-STU-13** The admin must be able to move a student to another class within the same year and record the reason.
- **FR-STU-14** The admin must be able to end an enrolment (left, transferred) without deleting the student.
- **FR-STU-15** The admin must be able to promote a whole class, or selected students, into a class for the next year.
- **FR-STU-16** The admin must be able to mark students as graduated at the end of the final form.
- **FR-STU-17** The system must be able to keep a student's past class when they are promoted.
- **FR-STU-18** A teacher must be able to view the students enrolled in their assigned classes for the active year.

### 4.3 Guardians

- **FR-STU-19** The admin must be able to add a guardian with full name, relationship, phone, email and address.
- **FR-STU-20** The admin must be able to view, update and remove a guardian. Removal must be refused while the guardian is linked to a student.
- **FR-STU-21** The admin must be able to link one guardian to several students and several guardians to one student.
- **FR-STU-22** The admin must be able to mark one guardian as the primary contact for a student, and unlink a guardian from a student.
- **FR-STU-23** The admin must be able to invite a guardian to sign in.
- **FR-STU-24** A parent must be able to view the profiles, results, attendance and invoices of only their linked students.
- **FR-STU-25** The system must be able to record guardian contact details as sensitive and write each view by a non-guardian to the audit log.

### 4.4 Subjects and the student account

- **FR-STU-26** The admin must be able to assign subjects, or an A-Level combination, to a student for a year.
- **FR-STU-27** The admin must be able to view and change a student's subjects for the active year without changing past years.
- **FR-STU-28** A student must be able to sign in and view their own profile, class, subjects and the information other modules add to their profile.
- **FR-STU-29** The system must be able to publish an event when a student is enrolled, updated or changes class, so other modules can react.

## 5. Staff (required)

- **FR-STF-01** The admin must be able to register a staff member with names, gender, phone, email, address, staff type and optional qualification.
- **FR-STF-02** The admin must be able to view, search and filter staff by type, status and campus.
- **FR-STF-03** The admin must be able to open a staff profile.
- **FR-STF-04** The admin must be able to update a staff member's details and staff type.
- **FR-STF-05** The admin must be able to set a staff member to active or inactive. Inactive staff must keep their history.
- **FR-STF-06** The admin must be able to remove a staff record that has no assignments, results or recorded incidents.
- **FR-STF-07** The admin must be able to assign a teacher to subjects for an academic year, and remove an assignment.
- **FR-STF-08** The admin must be able to assign a teacher to classes for an academic year, and remove an assignment.
- **FR-STF-09** The admin must be able to view, for any year, which subjects and classes a teacher had.
- **FR-STF-10** A teacher must be able to view their own assignments for the active year.
- **FR-STF-11** The admin must be able to invite a staff member to sign in and give them a role.
- **FR-STF-12** The admin must be able to import and export staff records.
- **FR-STF-13** The system must be able to refuse two active assignments of the same teacher, subject and class in one year.

## 6. Assessment and results

- **FR-ASM-01** The admin must be able to create, view, update and deactivate assessment types (assignment, test, quiz, midterm, final exam).
- **FR-ASM-02** The admin must be able to define grading scales per level, with score ranges and grade labels, and edit them for future use.
- **FR-ASM-03** A teacher must be able to enter marks, and an optional comment, for each student in an assigned class and subject, for one assessment, year and term.
- **FR-ASM-04** A teacher must be able to update a mark until results for that term are released, and view what they entered.
- **FR-ASM-05** The system must be able to calculate the grade from the scale and reject marks outside the allowed range.
- **FR-ASM-06** The admin must be able to release results for a term, and withdraw a release.
- **FR-ASM-07** A student and a linked parent must be able to view released results only.
- **FR-ASM-08** The system must be able to produce a report card per student per term, which the admin and teacher must be able to print or download.
- **FR-ASM-09** The system must be able to keep results against the enrolment year, so later promotion does not change them.

## 7. Attendance

- **FR-ATT-01** A teacher must be able to record each student in an assigned class as present, absent or late for a date, with an optional comment.
- **FR-ATT-02** A teacher must be able to mark the whole class present, then change the exceptions.
- **FR-ATT-03** A teacher must be able to view and correct attendance for a recent date. The admin must be able to set how many days stay editable.
- **FR-ATT-04** The admin, the teacher, the student and a linked parent must be able to view attendance for a student, class and term.
- **FR-ATT-05** The system must be able to notify the primary guardian when a student is marked absent, when the school has turned that on.
- **FR-ATT-06** The system must be able to summarise attendance rates per student, class and term.

## 8. Finance

- **FR-FIN-01** The finance officer must be able to create, view, update and deactivate fee items (for example term fees, books, registration).
- **FR-FIN-02** The finance officer must be able to set, view and update the amount of a fee item per class and academic year.
- **FR-FIN-03** The system must be able to create invoices from the fee structure when a student is enrolled, and the finance officer must be able to create them in bulk.
- **FR-FIN-04** The finance officer must be able to view invoices filtered by class, student, term and status, and open one invoice.
- **FR-FIN-05** The finance officer must be able to add an ad-hoc charge to an invoice and void an unpaid invoice.
- **FR-FIN-06** The finance officer must be able to record a payment with amount, date, method and transaction reference, and allocate it to invoices.
- **FR-FIN-07** The system must be able to compute the outstanding balance from invoices and allocations.
- **FR-FIN-08** The system must be able to issue a numbered receipt, which the finance officer and the linked parent must be able to view and download.
- **FR-FIN-09** The finance officer must be able to reverse a payment only by a reversing entry, with a reason.
- **FR-FIN-10** The finance officer must be able to view expected, paid and outstanding totals per class and term.
- **FR-FIN-11** A parent must be able to view what their linked student owes.
- **FR-FIN-12** The system must be able to accept a confirmed payment from an installed payment provider and allocate it without creating a duplicate.
- **FR-FIN-13** The finance officer must be able to review payments that could not be matched and match or reject them.
- **FR-FIN-14** The system must be able to record every charge, payment, allocation and reversal in the audit log.

## 9. Timetable

- **FR-TTB-01** The admin must be able to define, edit and remove the named periods of the school day, with start and end times.
- **FR-TTB-02** The admin must be able to place a subject, teacher and class into a day and period, and remove that entry.
- **FR-TTB-03** The system must be able to refuse a second booking of the same teacher or the same class in one period.
- **FR-TTB-04** A teacher, a student and a linked parent must be able to view the relevant weekly timetable.

## 10. Lesson plans

- **FR-LSN-01** The admin must be able to create, edit and retire lesson-plan templates.
- **FR-LSN-02** A teacher must be able to write a lesson plan for a subject, class and year, attach files, and submit it.
- **FR-LSN-03** A teacher must be able to view and revise their own plans.
- **FR-LSN-04** An authorised reviewer must be able to approve a plan or return it with a comment.

## 11. Discipline

- **FR-DIS-01** The admin must be able to create, edit and deactivate incident types and severity levels.
- **FR-DIS-02** A teacher must be able to record an incident with type, severity, description, action taken and date.
- **FR-DIS-03** The recorder and the admin must be able to view and update an incident, and the admin must be able to close it.
- **FR-DIS-04** The system must be able to show an incident only to permitted staff and to a linked guardian, and record each view.

## 12. Clubs and activities

- **FR-CLB-01** The admin must be able to create, view, update and close a club, with a name, description and patron.
- **FR-CLB-02** The admin must be able to enrol and remove students for a club in an academic year.
- **FR-CLB-03** A club patron must be able to record, view, edit and remove a club activity with title, description and date.
- **FR-CLB-04** A student and a linked parent must be able to view the student's clubs.

## 13. Calendar

- **FR-CAL-01** The admin must be able to create a calendar event with title, description, date, type, academic year and an optional attachment.
- **FR-CAL-02** The admin must be able to view, update and cancel events.
- **FR-CAL-03** A user must be able to view upcoming events for their school.
- **FR-CAL-04** The admin must be able to notify parents about an event, including a fee reminder.

## 14. Student leadership

- **FR-LDR-01** The admin must be able to create, rename and retire leadership positions.
- **FR-LDR-02** The admin must be able to appoint a student to a position for a year, with start and end dates, and end that appointment.
- **FR-LDR-03** A user must be able to view current leadership holders. A student must be able to view their own appointments.

## 15. Notifications, files and audit

- **FR-NTF-01** The system must be able to send a notification to a user or guardian through the channels the school has enabled.
- **FR-NTF-02** A user must be able to read and dismiss their in-app notifications.
- **FR-NTF-03** A parent must be able to choose how they are contacted, within the channels the school offers.
- **FR-NTF-04** The admin must be able to view whether a notification was sent, delivered or failed.
- **FR-FIL-01** An authorised user must be able to attach a file to a record that supports attachments, and download files they are allowed to see.
- **FR-FIL-02** The system must be able to limit file size and type, and keep files inside the school.
- **FR-AUD-01** The admin must be able to search and export the audit log by person, action and date.
- **FR-AUD-02** The system must be able to export all data held about one person, and erase it where the school confirms it is lawful.

## 16. Extensions

These requirements make modules and plugins installable. Academics, Students and Staff stay installed and cannot be removed.

- **FR-EXT-01** The system must be able to run each business area as a module that a school can enable, and each small add-on as a plugin.
- **FR-EXT-02** A platform administrator must be able to upload an extension package, and the system must be able to reject packages that are unsigned, too large or invalid.
- **FR-EXT-03** The system must be able to verify a package signature against trusted publishers, and a platform administrator must be able to add and revoke publisher keys.
- **FR-EXT-04** The admin must be able to read, before enabling, which data and permissions an extension requests.
- **FR-EXT-05** The admin must be able to enable, disable and update an extension for their school. Disabling must keep the extension's data.
- **FR-EXT-06** The admin must be able to remove an extension and choose to keep or export-and-delete its data.
- **FR-EXT-07** The system must be able to refuse disabling Academics, Students or Staff.
- **FR-EXT-08** The system must be able to show an extension's pages and menu entries only to people with the extension's permissions.
- **FR-EXT-09** The system must be able to let an extension add a tab or dashboard widget to an existing screen.
- **FR-EXT-10** The system must be able to deliver school events (for example a new enrolment or an absence) to extensions that subscribe to them.
- **FR-EXT-11** The system must be able to stop using an extension version when its publisher or signature is revoked, and tell the admin.
- **FR-EXT-12** The system must be able to keep one school's extension data and settings separate from every other school.

## 17. Language and access

- **FR-I18N-01** A user must be able to use the application in English or Swahili, and the system must be able to remember the choice.
- **FR-I18N-02** The system must be able to format dates, numbers and money for the active language.
- **FR-ACC-01** A user must be able to complete every action with a keyboard and a screen reader.
- **FR-ACC-02** The system must be able to present every screen on a small phone and on a slow connection.
