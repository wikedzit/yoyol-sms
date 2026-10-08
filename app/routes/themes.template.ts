import defaultTheme from '../../themes/themes/yoyol-default.json';

export function loader() {
  return new Response(JSON.stringify(defaultTheme, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="yoyol-default.json"',
    },
  });
}
