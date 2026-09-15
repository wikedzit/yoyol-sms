import {
  type ActionFunctionArgs,
  redirect,
} from 'react-router';

import type SchoolService from 'workers/services/school';
import type CampusService from 'workers/services/campus';

export async function action({
  request,
  params,
  context,
}: ActionFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    campus: CampusService;
  };

  const schoolId = Number(params.schoolId);

  if (!schoolId) {
    return Response.json(
      { error: 'Invalid school.' },
      { status: 400 }
    );
  }

  // Verify that the school belongs to the current owner.
  const school = await services.school.getById(schoolId);

  if (!school) {
    return Response.json(
      { error: 'School not found.' },
      { status: 404 }
    );
  }

  const form = await request.formData();

  const method = String(form.get('_method') || 'POST');

  /*
   * UPDATE CAMPUS
   */
  if (method === 'PUT') {
    const id = Number(form.get('id'));

    if (!id) {
      return Response.json(
        { error: 'Invalid campus ID.' },
        { status: 400 }
      );
    }

    const name = String(form.get('name') || '').trim();
    const code = String(form.get('code') || '').trim();
    const address = String(form.get('address') || '').trim();

    if (!name) {
      return Response.json(
        { error: 'Campus name is required.' },
        { status: 400 }
      );
    }

    const updated = await services.campus.update(id, {
      name,
      code,
      address,
    });

    if (!updated) {
      return Response.json(
        { error: 'Failed to update campus.' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      campus: updated,
    });
  }

  /*
   * DELETE CAMPUS
   */
  if (method === 'DELETE') {
    const id = Number(form.get('id'));

    if (!id) {
      return Response.json(
        { error: 'Invalid campus ID.' },
        { status: 400 }
      );
    }

    const deleted = await services.campus.delete(id);

    if (!deleted) {
      return Response.json(
        { error: 'Failed to delete campus.' },
        { status: 400 }
      );
    }

    return redirect('/schools/profile');
  }

  return Response.json(
    { error: 'Unsupported method.' },
    { status: 400 }
  );
}
