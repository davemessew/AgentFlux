// Registered example connector: fixed program, JSON output, no shell.
process.stdout.write(JSON.stringify([
  { title: 'Wartung Förderanlage', department: 'Betrieb', priority: 'hoch', status: 'offen', text: 'Synthetisches Beispiel: Wartung am Donnerstag einplanen.' },
  { title: 'Einführung neue Mitarbeitende', department: 'Personal', priority: 'normal', status: 'offen', text: 'Synthetisches Beispiel: Unterlagen für die Einführung zusammenstellen.' }
]));
