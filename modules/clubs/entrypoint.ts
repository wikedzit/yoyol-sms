import {
  clubActivityDocument,
  clubDetailDocument,
  clubListDocument,
  clubMissingDocument,
} from '../../workers/kernel/club-pages';
import type { ClubsPage } from '../../workers/kernel/clubs';
import { defineModule } from '../../workers/kernel/sdk';
import source from './yoyol.extension.json';

const clubs = defineModule({
  manifest: source,
  async handlePage(request, context) {
    const page = await context.clubs?.open();
    if (!page) return clubMissingDocument();
    const activity = /^\/(\d+)\/activities\/(\d+)$/.exec(request.path);
    if (activity) return activityPage(page, Number(activity[1]), Number(activity[2]));
    const club = /^\/(\d+)$/.exec(request.path);
    if (club) return detailPage(page, Number(club[1]));
    return listPage(page);
  },
  async handleAction(_name, fields, context) {
    return context.clubs?.save(fields) ?? { error: 'Clubs are not available.' };
  },
});

function listPage(page: ClubsPage) {
  return clubListDocument({
    canManage: page.canManage,
    teachers: page.teachers,
    clubs: page.clubs.map((club) => ({
      ...club,
      memberCount: page.members.filter((member) => member.clubId === club.id).length,
    })),
  });
}

function detailPage(page: ClubsPage, clubId: number) {
  const club = page.clubs.find((item) => item.id === clubId);
  if (!club) return clubMissingDocument();
  return clubDetailDocument({
    club: {
      ...club,
      memberCount: page.members.filter((member) => member.clubId === club.id).length,
    },
    canManage: page.canManage,
    members: page.members
      .filter((member) => member.clubId === club.id)
      .map((member) => ({ id: member.id, studentName: member.studentName })),
    activities: page.activities
      .filter((activity) => activity.clubId === club.id)
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        activityDate: activity.activityDate,
        canWrite: activity.canWrite,
      })),
    students: page.students,
    teachers: page.teachers,
  });
}

function activityPage(page: ClubsPage, clubId: number, activityId: number) {
  const club = page.clubs.find((item) => item.id === clubId);
  const activity = page.activities.find((item) => item.id === activityId && item.clubId === clubId);
  if (!club || !activity) return clubMissingDocument();
  return clubActivityDocument({
    club: {
      ...club,
      memberCount: page.members.filter((member) => member.clubId === club.id).length,
    },
    activity: {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      activityDate: activity.activityDate,
      canWrite: activity.canWrite,
    },
  });
}

export default clubs;
