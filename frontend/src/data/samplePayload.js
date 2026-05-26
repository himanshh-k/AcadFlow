/** Input sent to POST /api/v1/generate — AIML-A / B / C (matches your Swagger payload). */
function sectionCourses(section) {
  const prefix = section.split('-')[1] || 'A';
  const batch1 = `(${prefix}1, ${prefix}2)`;
  const batch2 = `(${prefix}3, ${prefix}4)`;

  return [
    { id: 'CAT6001', name: 'DL-1', teachers: ['NG'], section, hours: 3, is_lab: false, elective_group: null },
    
    // Batch Swapped Labs: DL-1 vs CV
    { id: 'CAP6001-A', name: `DL-1 LAB ${batch1}`, teachers: ['NG'], section, hours: 2, is_lab: true, elective_group: `Swap1_${section}` },
    { id: 'CAP6002-A', name: `CV LAB ${batch2}`, teachers: ['PJ'], section, hours: 2, is_lab: true, elective_group: `Swap1_${section}` },
    { id: 'CAP6002-B', name: `CV LAB ${batch1}`, teachers: ['PA'], section, hours: 2, is_lab: true, elective_group: `Swap2_${section}` },
    { id: 'CAP6001-B', name: `DL-1 LAB ${batch2}`, teachers: ['PD'], section, hours: 2, is_lab: true, elective_group: `Swap2_${section}` },

    { id: 'CAT6002', name: 'CV', teachers: ['PA'], section, hours: 3, is_lab: false, elective_group: null },
    { id: 'CAT6003-1', name: 'NLP', teachers: ['AP'], section, hours: 3, is_lab: false, elective_group: 'Group_6003_Theory' },
    { id: 'CAT6003-2', name: 'DMW', teachers: ['SU'], section, hours: 3, is_lab: false, elective_group: 'Group_6003_Theory' },
    { id: 'CAP6003-1', name: 'NLP LAB', teachers: ['AP', 'PP'], section, hours: 2, is_lab: true, elective_group: 'Group_6003_Lab' },
    { id: 'CAP6003-2', name: 'DMW LAB', teachers: ['SU', 'AL'], section, hours: 2, is_lab: true, elective_group: 'Group_6003_Lab' },
    { id: 'CAT6004-1', name: 'BCT', teachers: ['ST'], section, hours: 3, is_lab: false, elective_group: 'Group_6004_Theory' },
    { id: 'CAT6004-2', name: 'CRM', teachers: ['SL'], section, hours: 3, is_lab: false, elective_group: 'Group_6004_Theory' },
    { id: 'CAP6004-1', name: 'BCT LAB', teachers: ['ST', 'DM'], section, hours: 2, is_lab: true, elective_group: 'Group_6004_Lab' },
    { id: 'CAP6004-2', name: 'CRM LAB', teachers: ['SL'], section, hours: 2, is_lab: true, elective_group: 'Group_6004_Lab' },
    { id: 'CAT6005', name: 'IoT', teachers: ['SB'], section, hours: 2, is_lab: false, elective_group: null },
  ]
}

export const samplePayload = {
  num_days: 5,
  num_periods: 8,
  sections: ['AIML-A', 'AIML-B', 'AIML-C'],
  teachers: ['NG', 'PD', 'PA', 'PJ', 'AP', 'PP', 'SU', 'AL', 'ST', 'DM', 'SL', 'SB'],
  rooms: ['DT 403', 'DT 406', 'DT 412', 'Lab 409', 'Lab 411', 'Lab 307'],
  courses: [
    ...sectionCourses('AIML-A'),
    ...sectionCourses('AIML-B'),
    ...sectionCourses('AIML-C'),
  ],
}

export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
