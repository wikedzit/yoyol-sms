export type ClassroomChoice = {
  formClassId: number | null;
  universityClassId: number | null;
};

export function schoolClassroom(input: {
  formClassId?: number | null;
  universityClassId?: number | null;
}): ClassroomChoice {
  return {
    formClassId: input.formClassId ?? null,
    universityClassId: null,
  };
}
