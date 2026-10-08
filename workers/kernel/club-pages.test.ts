import assert from 'node:assert/strict';
import test from 'node:test';
import { clubDetailDocument, clubListDocument } from './club-pages.ts';
import { parseViewDocument } from './view-document.ts';

const science = {
  id: 4,
  name: 'Science club',
  description: 'Experiments after school.',
  patronId: 1,
  patronName: 'Joseph A Kimaro',
  closed: false,
  canWrite: true,
  memberCount: 1,
};

test('the clubs list is a table that opens each club', () => {
  const document = parseViewDocument(clubListDocument({
    canManage: true,
    clubs: [science, { ...science, id: 2, name: 'Chess club', closed: true, canWrite: false, memberCount: 0 }],
    teachers: [{ id: 1, name: 'Joseph A Kimaro' }],
  }));
  const table = document.body.find((node) => node.type === 'table');
  const rows = table && 'rows' in table && Array.isArray(table.rows) ? table.rows : [];
  const openClub = rows[0]?.cells;
  const name = openClub && typeof openClub === 'object' && 'name' in openClub ? openClub.name : null;
  assert.equal(name && typeof name === 'object' && 'type' in name ? name.type : '', 'sheet');
  const form = name && typeof name === 'object' && 'body' in name && Array.isArray(name.body) ? name.body[0] : null;
  const fields = form && typeof form === 'object' && 'fields' in form && Array.isArray(form.fields) ? form.fields : [];
  const nameField = fields.find((field) => field && typeof field === 'object' && 'name' in field && field.name === 'name');
  assert.equal(nameField && typeof nameField === 'object' && 'value' in nameField ? nameField.value : '', 'Science club');
  const actions = openClub && typeof openClub === 'object' && 'actions' in openClub ? openClub.actions : null;
  const actionBody = actions && typeof actions === 'object' && 'body' in actions && Array.isArray(actions.body) ? actions.body : [];
  const manage = actionBody.find((node) => node && typeof node === 'object' && 'type' in node && node.type === 'link');
  assert.equal(manage && typeof manage === 'object' && 'href' in manage ? manage.href : '', '/x/clubs/4');
  assert.equal(rows[1]?.href, '/x/clubs/2');
  const toolbar = table && 'toolbar' in table && Array.isArray(table.toolbar) ? table.toolbar[0] : null;
  assert.equal(toolbar && typeof toolbar === 'object' && 'type' in toolbar ? toolbar.type : '', 'sheet');
});

test('a club page lists members and activities in tables', () => {
  const document = parseViewDocument(clubDetailDocument({
    club: science,
    canManage: true,
    members: [{ id: 8, studentName: 'Amina Hassan' }],
    activities: [{
      id: 3,
      title: 'Friday experiment',
      description: 'Built a simple circuit.',
      activityDate: '2026-10-09',
      canWrite: true,
    }],
    students: [{ id: 2, name: 'Amina Hassan' }],
    teachers: [{ id: 1, name: 'Joseph A Kimaro' }],
  }));
  assert.equal(document.title, 'Science club');
  assert.equal(document.body.filter((node) => node.type === 'section').length, 2);
  assert.equal(document.body[0]?.type, 'actions');
});
