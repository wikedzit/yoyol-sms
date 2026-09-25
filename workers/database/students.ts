import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

import { classes } from "./class";
import { formClasses } from "./academic-levels";
import { campus } from "./campuses";
import { users } from "./users";

export const students = sqliteTable(
  "students",
  {
    id: integer("id").primaryKey({
      autoIncrement: true,
    }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),

    gender: text("gender")
      .notNull()
      .default("Male"),

    dob: text("dob"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),

    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),

    photoUrl: text("photo_url"),

    course: text("course"),
    grade: text("grade"),

    admissionNumber: text("admission_number"),

    enrollmentDate: text("enrollment_date"),

    status: text("status")
      .notNull()
      .default("Active"),

    createdAt: integer("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    // Legacy class relationship
    classId: integer("class_id").references(
      () => classes.id,
      {
        onDelete: "cascade",
      },
    ),

    // Specific class within a form/stream
    formClassId: integer("form_class_id").references(
      () => formClasses.id,
      {
        onDelete: "cascade",
      },
    ),

    // Campus the student belongs to
    campusId: integer("campus_id").references(
      () => campus.id,
      {
        onDelete: "set null",
      },
    ),

    // Owner of the student record
    ownerUserId: integer("owner_user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
  },

  (table) => ({
    ownerAdmissionNumberUnique: uniqueIndex(
      "students_owner_admission_number_unique",
    ).on(
      table.ownerUserId,
      table.admissionNumber,
    ),
    ownerUserIdIdx: index("students_owner_user_id_idx").on(
      table.ownerUserId,
    ),
  }),
);

export const studentsRelations = relations(
  students,
  ({ one }) => ({
    class: one(classes, {
      fields: [students.classId],
      references: [classes.id],
    }),

    formClass: one(formClasses, {
      fields: [students.formClassId],
      references: [formClasses.id],
    }),

    campus: one(campus, {
      fields: [students.campusId],
      references: [campus.id],
    }),

    owner: one(users, {
      fields: [students.ownerUserId],
      references: [users.id],
    }),
  }),
);

export type InsertStudent =
  typeof students.$inferInsert;

export type SelectStudent =
  typeof students.$inferSelect;