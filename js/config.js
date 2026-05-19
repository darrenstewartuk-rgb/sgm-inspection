'use strict';

const AUDIT_CONFIG = {
  appVersion: '1.1',
  company: 'SGM Window Manufacturing Ltd',
  title: 'Factory Inspection',
  defaultLocation: '1,2,3,5 and 6, Honywood Square, Honywood Rd, Basildon SS14 3HT, UK',
  defaultAssignees: ['Darren Stewart', 'Gary May', 'Dominic Mann'],
  units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 5', 'Unit 6', 'Customercare Office', 'Spray Room'],
  priorities: ['Low', 'Medium', 'High'],

  complianceFooter: 'This inspection supports the employer duty of care under HASAWA 1974 s.2 and the requirement for a suitable and sufficient risk assessment under MHSWR 1999 reg.3. It does not replace the judgement of a competent assessor.',

  sections: [
    {
      id: 'general_workplace',
      name: 'General Workplace',
      regulation: 'Workplace (Health, Safety and Welfare) Regulations 1992',
      questions: [
        'Safety signage is visible and legible',
        'Floors are free from slip and trip hazards',
        'Designated walkways are clean and unobstructed',
        'Floor is clear of waste around containers and bins',
        'Work areas are organised for safe operation',
        'Loading areas are clear',
        'Products are stored correctly, preventing trip hazards'
      ]
    },
    {
      id: 'fire_emergency',
      name: 'Fire & Emergency Provisions',
      regulation: 'Regulatory Reform (Fire Safety) Order 2005',
      questions: [
        'Fire assembly point is clearly marked',
        'Fire exits are clearly marked',
        'Fire exits are clear of obstructions',
        'Combustibles are stored away from exits and stairs',
        'Fire registers are up to date with line leaders',
        'Fire alarm call points are clear and unobstructed',
        'Fire doors have correct safety devices fitted',
        'Fire extinguishers are free from obstruction, undamaged, fully charged and in date',
        'Emergency spill kits are present'
      ]
    },
    {
      id: 'electrical',
      name: 'Electrical',
      regulation: 'Electricity at Work Regulations 1989 / PUWER 1998',
      questions: [
        'PAT testing is within 12 months',
        'Cables are free from damage and splits',
        'Sockets are visibly undamaged',
        'Machine isolators are in good order'
      ]
    },
    {
      id: 'ppe',
      name: 'PPE',
      regulation: 'Personal Protective Equipment at Work Regulations 1992',
      questions: [
        'Hi-Viz is worn where appropriate',
        'Eye, glove and ear protection is worn where appropriate',
        'Safety footwear is worn and in good condition'
      ]
    },
    {
      id: 'manual_handling',
      name: 'Manual & Mechanical Handling',
      regulation: 'Manual Handling Operations Regulations 1992',
      questions: [
        'Good manual handling techniques are observed',
        'Manual handling aids are in use',
        'Trolley and cart wheels are free from debris and moving freely'
      ]
    },
    {
      id: 'equipment_machinery',
      name: 'Equipment & Machinery',
      regulation: 'Provision and Use of Work Equipment Regulations 1998',
      questions: [
        'Areas around machinery are clean and clear',
        'Machinery is in good working order',
        'Fixed guards are secured by approved means only',
        'Safety stops are functioning correctly',
        'Areas are free of trailing cables',
        'Pre-start checks completed with visible signed checklists by machines',
        'Hoses are free from compressed air leaks'
      ]
    },
    {
      id: 'hazardous_substances',
      name: 'Hazardous Substances',
      regulation: 'Control of Substances Hazardous to Health Regulations 2002',
      questions: [
        'Substances are stored and secured in a COSHH cabinet to prevent unauthorised use'
      ]
    },
    {
      id: 'facilities_welfare',
      name: 'Facilities & Welfare',
      regulation: 'Workplace (Health, Safety and Welfare) Regulations 1992',
      questions: [
        'General illumination and loading bay lamps are working',
        'Welfare facilities are clean and acceptable (toilets, sinks, kitchen)'
      ]
    },
    {
      id: 'racking_storage',
      name: 'Racking & General Storage',
      regulation: 'Provision and Use of Work Equipment Regulations 1998',
      questions: [
        'Racking and stillage — loaded and empty systems are secure and undamaged',
        'Damaged racking is isolated and made unavailable'
      ]
    }
  ]
};
