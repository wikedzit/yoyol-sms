import coastalTheme from '../../extensions/themes/themes/coastal.json';

export function loader() {
  return new Response(JSON.stringify(coastalTheme, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="coastal.json"',
    },
  });
}
