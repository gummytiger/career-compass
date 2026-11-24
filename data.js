/* Career Compass — generic starter data (no personal details; safe to publish).
 * Everything here is a HYPOTHESIS or a planning estimate, not a verified fact.
 * No contact details, no invented postings, salaries or company facts. */
window.CC_DATA = (function () {
  // Activities used for preference matching. `label` is user-facing.
  var activities = [
    { id: 'coding', label: 'Coding / SQL-heavy work', hint: 'Daily SQL, Python or R as a core part of the job.' },
    { id: 'dataCleaning', label: 'Cleaning datasets', hint: 'Wrangling messy data before analysis.' },
    { id: 'predictiveModeling', label: 'Predictive modeling', hint: 'Building statistical / ML models.' },
    { id: 'financeModeling', label: 'Excel modeling & financial statements', hint: 'Spreadsheets, forecasts, reading statements.' },
    { id: 'marketResearch', label: 'Market & company research', hint: 'Exploring current real-world information.' },
    { id: 'markets', label: 'Stocks & markets', hint: 'Following securities and market moves.' },
    { id: 'writing', label: 'Writing memos & reports', hint: 'Turning analysis into written recommendations.' },
    { id: 'presentations', label: 'Presentations & slides', hint: 'Explaining findings to others.' },
    { id: 'clientInteraction', label: 'Talking with clients / customers', hint: 'Calls, questions and relationships with people outside the company. Being okay with it is a 3; wanting it is a 4–5.' },
    { id: 'sales', label: 'Sales & targets', hint: 'Revenue goals, prospecting, licensing.' },
    { id: 'coordination', label: 'Scheduling & coordinating with teammates', hint: 'Internal: lining up coworkers, deadlines and handoffs so work gets done.' },
    { id: 'coordExternal', label: 'Scheduling & coordinating with customers', hint: 'External: booking, following up and keeping customers or clients on track.' },
    { id: 'operations', label: 'Operational problem-solving', hint: 'Fixing how work flows.' },
    { id: 'productImprovement', label: 'Improving a product with insights', hint: 'Using analysis to make something better.' }
  ];
  var ACT = activities.map(function (a) { return a.id; });

  // Neutral starter preferences (everything Unsure). desired: 1 dislike … 5 love, null unknown.
  var seedPrefs = {
    coding: { desired: null, importance: 2, constraint: null, source: '' },
    dataCleaning: { desired: null, importance: 2, constraint: null, source: '' },
    predictiveModeling: { desired: null, importance: 2, constraint: null, source: '' },
    financeModeling: { desired: null, importance: 2, constraint: null, source: '' },
    marketResearch: { desired: null, importance: 2, constraint: null, source: '' },
    markets: { desired: null, importance: 2, constraint: null, source: '' },
    writing: { desired: null, importance: 2, constraint: null, source: '' },
    presentations: { desired: null, importance: 2, constraint: null, source: '' },
    clientInteraction: { desired: null, importance: 2, constraint: null, source: '' },
    sales: { desired: null, importance: 2, constraint: null, source: '' },
    coordination: { desired: null, importance: 2, constraint: null, source: '' },
    coordExternal: { desired: null, importance: 2, constraint: null, source: '' },
    operations: { desired: null, importance: 2, constraint: null, source: '' },
    productImprovement: { desired: null, importance: 2, constraint: null, source: '' }
  };

  function attrs(arr) { var o = {}; ACT.forEach(function (id, i) { o[id] = arr[i]; }); return o; }
  // attr order: coding, dataCleaning, predictiveModeling, financeModeling, marketResearch, markets,
  //             writing, presentations, clientInteraction, sales, coordination, coordExternal, operations, productImprovement
  // All role values are EDITABLE ESTIMATES, not verified facts.

  var profile = { gradDate: '', degree: '', locations: '', start: '', workAuth: '', notes: '' };

  var roles = [
    { id: 'credit', title: 'Commercial banking / credit analyst', family: 'Banking & credit', baselineFit: 3, readiness: 2,
      attrs: attrs([2,2,2,5,3,2,4,3,3,1,2,2,1,1]),
      desc: 'Assess whether businesses can repay loans: read borrower financials, write credit memos, support relationship managers.',
      day: 'Read a borrower’s statements, spread the numbers in Excel, test cash flow and leverage, draft a memo with a recommendation.',
      req: ['accounting','credit','excel'], help: ['communication','commercial','quant'],
      gap: 'Accounting, cash flow and debt ratios', next: 'Write a credit memo on a public company.',
      cats: ['banks'], titles: ['credit analyst','commercial credit development program','underwriter'], note: 'Rotational/development credit programs vary on eligibility — verify.' },
    { id: 'invConsult', title: 'Investment consulting / institutional advisory', family: 'Investment', baselineFit: 3, readiness: 2,
      attrs: attrs([2,1,1,4,4,4,3,5,4,2,2,3,1,1]),
      desc: 'Advise pension funds, endowments and foundations: research fund managers, shape allocations, build client deliverables.',
      day: 'Compare managers, update a performance report, draft slides for a client meeting.',
      req: ['portfolio','communication','quant'], help: ['accounting','excel','commercial'],
      gap: 'Asset allocation, manager evaluation, presenting', next: 'Prepare a hypothetical client portfolio recommendation.',
      cats: ['advisory','asset'], titles: ['investment analyst consulting','associate consultant investments','institutional advisory analyst'], note: '' },
    { id: 'strategy', title: 'Business strategy / operations analyst', family: 'Strategy & operations', baselineFit: 3, readiness: 2,
      attrs: attrs([3,2,2,3,4,1,3,4,3,1,4,3,5,4]),
      desc: 'Track KPIs, size markets, find operational improvements and help teams execute across functions.',
      day: 'Pull KPIs, sanity-check a market estimate, interview stakeholders, write up options.',
      req: ['marketSizing','communication','commercial'], help: ['excel','caseSkills','processKpi'],
      gap: 'Market sizing, unit economics, stakeholder evidence', next: 'Analyze a business or process end to end.',
      cats: ['fintech','consulting','banks'], titles: ['strategy analyst','business operations associate','business analyst'], note: 'Some strategy roles lean on SQL — screen postings.' },
    { id: 'invResearch', title: 'Investment research associate', family: 'Investment', baselineFit: 3, readiness: 2,
      attrs: attrs([2,2,2,5,5,5,5,3,1,1,1,1,1,1]),
      desc: 'Research companies and industries, value them and write an investment thesis.',
      day: 'Update a model after earnings, read filings, write a short note on whether the stock is mispriced.',
      req: ['accounting','valuation','communication'], help: ['excel','quant','directFinance'],
      gap: 'Accounting, DCF and multiples', next: 'Write an investment thesis on a public company.',
      cats: ['asset'], titles: ['investment research associate','equity research associate','research analyst'], note: 'Competitive entry; many seek finance internships.' },
    { id: 'portfolio', title: 'Portfolio analyst / portfolio strategy', family: 'Investment', baselineFit: 3, readiness: 2,
      attrs: attrs([3,3,2,5,4,5,3,3,2,1,2,1,1,1]),
      desc: 'Monitor allocation, performance attribution and risk for investment portfolios.',
      day: 'Reconcile positions, explain what drove performance versus a benchmark, flag risk concentrations.',
      req: ['portfolio','excel','quant'], help: ['accounting','sqlPython','communication'],
      gap: 'Portfolio construction, benchmark choice, explaining risk', next: 'Turn a portfolio or class project into a clear performance story.',
      cats: ['asset'], titles: ['portfolio analyst','investment operations analyst'], note: 'Some roles are coding-heavy — screen postings.' },
    { id: 'mgmtConsult', title: 'Management / economic consulting', family: 'Consulting', baselineFit: 3, readiness: 2,
      attrs: attrs([2,1,1,2,4,1,3,5,5,1,3,4,4,3]),
      desc: 'Solve client business problems with research, structured thinking and slides. Economic consulting may involve econometrics.',
      day: 'Research a market, build a slide, meet a client, iterate on the storyline.',
      req: ['caseSkills','communication','quant'], help: ['commercial','excel'],
      gap: 'Case interviews and structured recommendations', next: 'Do case practice and one strategy deck.',
      cats: ['consulting'], titles: ['associate consultant','analyst consulting','economic consulting analyst'], note: 'Travel and data/coding demands vary by firm.' },
    { id: 'fpa', title: 'Corporate finance / FP&A analyst', family: 'Corporate finance', baselineFit: 3, readiness: 2,
      attrs: attrs([2,2,1,5,2,1,2,3,1,1,3,1,3,1]),
      desc: 'Budgets, forecasts and variance analysis; partner with internal business teams.',
      day: 'Close the month’s variance report, update the forecast, explain gaps to a business lead.',
      req: ['accounting','valuation','excel'], help: ['commercial','communication','coordination'],
      gap: 'Accounting, forecasting, financial modeling', next: 'Build a 12-month forecast with scenarios.',
      cats: ['fintech','banks'], titles: ['financial analyst','FP&A analyst'], note: '' },
    { id: 'rotational', title: 'Business rotational / analyst development program', family: 'Programs', baselineFit: 3, readiness: 2,
      attrs: attrs([2,1,1,3,3,1,2,3,3,2,4,3,4,3]),
      desc: 'Several placements across functions with training and mentorship — broad exposure, portable skills.',
      day: 'Varies by rotation. Verify content and eligibility for each program.',
      req: ['communication','coordination','commercial'], help: ['excel','quant','recency'],
      gap: 'Collaboration, adaptability, leadership examples', next: 'Verify eligibility; line up two behavioral stories.',
      cats: ['banks','fintech'], titles: ['rotational program analyst','development program associate'], note: 'Some 2027 programs exclude earlier graduates — check each.' },
    { id: 'productOps', title: 'Product operations / program coordination', family: 'Strategy & operations', baselineFit: 3, readiness: 2,
      attrs: attrs([2,1,1,1,2,1,3,3,3,1,5,2,5,5]),
      desc: 'Milestones, requirements and cross-functional execution. Adjacent path; entry level varies.',
      day: 'Chase dependencies, update a status report, run a check-in, unblock a team.',
      req: ['coordination','projectMgmt','communication'], help: ['processKpi','commercial'],
      gap: 'Evidence of ownership and stakeholder management', next: 'Own a small set of customer projects with a status report.',
      cats: ['fintech'], titles: ['program coordinator','associate program manager','product operations associate'], note: 'Target true associate/coordinator roles.' },
    { id: 'fintechRisk', title: 'Fintech credit-risk analytics / decision science', family: 'Fintech', baselineFit: 3, readiness: 2,
      attrs: attrs([5,5,5,3,4,2,2,2,1,1,1,1,2,3]),
      desc: 'SQL/Python, risk models, experiments and large datasets.',
      day: 'Query large tables, build or tune a risk model, review an A/B test.',
      req: ['sqlPython','quant','credit'], help: ['accounting'],
      gap: 'Technical mismatch with current preferences', next: 'Consider credit policy or underwriting roles instead.',
      cats: ['fintech'], titles: ['credit policy analyst','underwriting analyst'], note: 'Same title can mean very different work — see the title trap on the Plan page.' },
    { id: 'clientSvc', title: 'Client investment services / advisory support', family: 'Client-facing', baselineFit: 3, readiness: 2,
      attrs: attrs([1,1,1,3,1,3,2,3,5,4,3,4,2,2]),
      desc: 'Client service, account support, advice support; sometimes sales goals and licensing.',
      day: 'Answer client questions, prepare account reviews, hit service targets.',
      req: ['communication','commercial'], help: ['directFinance','accounting'],
      gap: 'Confirm interest in customer-facing work, sales goals and licensing', next: 'Ask three people in the role how much is service vs sales.',
      cats: ['asset','banks'], titles: ['client service associate','investment services representative'], note: 'Confirm sales targets and licensing before applying.' },
    { id: 'customerSuccess', title: 'Customer success / account coordination', family: 'Client-facing', baselineFit: 3, readiness: 2,
      attrs: attrs([1,1,1,2,2,1,3,3,5,2,3,5,3,3]),
      desc: 'Help customers get value from a product or service: onboarding, scheduling check-ins, tracking issues, flagging risks to internal teams.',
      day: 'Run a customer check-in, update the account tracker, chase an answer from an internal team, send a follow-up.',
      req: ['communication','coordination','commercial'], help: ['processKpi','excel'],
      gap: 'Examples of keeping customers on track, and how you handle difficult conversations', next: 'Talk to two people in customer success about a typical week.',
      cats: ['fintech','banks'], titles: ['customer success associate','account coordinator','client onboarding associate'], note: 'Some roles carry sales or renewal targets — check.' },
    { id: 'opsCoord', title: 'Operations / project coordinator', family: 'Strategy & operations', baselineFit: 3, readiness: 2,
      attrs: attrs([2,2,1,2,1,1,2,2,2,1,5,2,5,3]),
      desc: 'Keep internal work moving: schedules, trackers, handoffs and status updates between teams.',
      day: 'Update the project tracker, schedule a cross-team review, follow up on late items, write the weekly status.',
      req: ['coordination','projectMgmt','communication'], help: ['processKpi','excel'],
      gap: 'Evidence of owning deadlines and following through', next: 'Run a small project with a plan and a weekly status note.',
      cats: ['fintech','banks'], titles: ['operations coordinator','project coordinator','business operations associate'], note: 'Entry-level titles vary — read the duties, not the title.' }
  ];

  var skills = [
    { id: 'quant', name: 'Quantitative foundation', state: 'unknown', note: '' },
    { id: 'excel', name: 'Excel & quantitative tools', state: 'unknown', note: '' },
    { id: 'sqlPython', name: 'SQL / Python for analytics', state: 'unknown', note: '' },
    { id: 'portfolio', name: 'Portfolio construction & performance', state: 'unknown', note: '' },
    { id: 'directFinance', name: 'Direct finance experience', state: 'unknown', note: '' },
    { id: 'accounting', name: 'Accounting & financial statements', state: 'unknown', note: '' },
    { id: 'valuation', name: 'Valuation & financial modeling', state: 'unknown', note: '' },
    { id: 'credit', name: 'Credit analysis', state: 'unknown', note: '' },
    { id: 'commercial', name: 'Commercial understanding', state: 'unknown', note: '' },
    { id: 'communication', name: 'Communication & presentation', state: 'unknown', note: '' },
    { id: 'coordination', name: 'Coordination & ownership', state: 'unknown', note: '' },
    { id: 'recency', name: 'Recent experience', state: 'unknown', note: '' },
    { id: 'caseSkills', name: 'Case interviewing & structured problem solving', state: 'unknown', note: '' },
    { id: 'marketSizing', name: 'Market sizing & unit economics', state: 'unknown', note: '' },
    { id: 'processKpi', name: 'Process mapping & KPIs', state: 'unknown', note: '' },
    { id: 'projectMgmt', name: 'Milestones, dependencies & status reporting', state: 'unknown', note: '' }
  ];

  var learning = [
    { id: 'acct', topic: 'Financial accounting & statement analysis', skills: ['accounting'], careers: ['credit','invResearch','fpa','invConsult','portfolio','clientSvc'], priority: 1, apply: 'Take one public company’s three statements and explain how they connect.' },
    { id: 'excelModel', topic: 'Excel financial modeling', skills: ['valuation','excel'], careers: ['credit','invResearch','fpa','portfolio','strategy','invConsult'], priority: 1, apply: 'Build a 12-month forecast with base / upside / downside.' },
    { id: 'creditBasics', topic: 'Credit fundamentals: leverage, coverage, liquidity, cash flow', skills: ['credit'], careers: ['credit','fintechRisk'], priority: 1, apply: 'Write a 2-page credit memo.' },
    { id: 'dcf', topic: 'Valuation: DCF and multiples', skills: ['valuation'], careers: ['invResearch','fpa'], priority: 2, apply: 'Value one public company and write a 2-page thesis.' },
    { id: 'alloc', topic: 'Asset allocation, benchmarks & performance attribution', skills: ['portfolio'], careers: ['invConsult','portfolio'], priority: 2, apply: 'Draft a hypothetical institutional portfolio recommendation.' },
    { id: 'case', topic: 'Consulting case-interview practice', skills: ['caseSkills'], careers: ['mgmtConsult','strategy'], priority: 2, apply: 'Run 5 timed cases and a strategy deck.' },
    { id: 'sizing', topic: 'Market sizing & unit economics', skills: ['marketSizing'], careers: ['strategy','mgmtConsult'], priority: 2, apply: 'Size one market and sanity-check unit economics.' },
    { id: 'proc', topic: 'Process mapping & KPI design', skills: ['processKpi'], careers: ['productOps','rotational','strategy'], priority: 2, apply: 'Map one process and propose KPIs.' },
    { id: 'story', topic: 'Slide storytelling & plain-English presenting', skills: ['communication'], careers: ['invConsult','mgmtConsult','strategy','rotational','clientSvc','credit'], priority: 2, apply: 'Present a finding in 5 minutes to someone outside finance.' },
    { id: 'pm', topic: 'Project basics: milestones, dependencies, risks, status reports', skills: ['projectMgmt','coordination'], careers: ['productOps','rotational'], priority: 3, apply: 'Write a plan with milestones for your own project.' },
    { id: 'bmc', topic: 'Bloomberg Market Concepts (markets)', skills: ['directFinance'], careers: ['invResearch','portfolio','invConsult'], priority: 4, optional: true, apply: 'Only if committed to investment paths.' },
    { id: 'cfaifc', topic: 'CFA Investment Foundations Certificate', skills: ['directFinance'], careers: ['invResearch','portfolio','invConsult','clientSvc'], priority: 4, optional: true, apply: 'Industry fundamentals; optional.' },
    { id: 'fmva', topic: 'CFI FMVA (modeling)', skills: ['valuation'], careers: ['fpa','invResearch','credit'], priority: 4, optional: true, apply: 'Optional — only if you need structure for modeling.' },
    { id: 'cfa1', topic: 'CFA Level I', skills: ['directFinance'], careers: ['invResearch','portfolio','invConsult'], priority: 5, optional: true, apply: 'Substantial commitment — only if you’re set on an investment career.' },
    { id: 'capm', topic: 'CAPM (project management)', skills: ['projectMgmt'], careers: ['productOps'], priority: 5, optional: true, apply: 'Lower priority; optional.' }
  ];

  var projects = [
    { id: 'mkProfit', source: 'real', title: 'Customer profitability analysis', r: [5,5,3,1], dur: '3–4 weeks',
      q: 'Which customers and products actually make money after complexity, quality, shipping and cost allocation?',
      data: '12–24 months of sales and costs, if available.', steps: ['Confirm the business needs this','Reconcile revenue and costs','Compute customer/product margins','Identify drivers and opportunities'],
      deliver: 'Excel margin model, dashboard, management recommendations', careers: ['fpa','strategy','mgmtConsult','invConsult'], skills: ['valuation','commercial','excel'] },
    { id: 'mkCredit', source: 'real', title: 'Customer portfolio & credit risk', r: [5,5,3,1], dur: '3–4 weeks',
      q: 'How concentrated is revenue, how exposed are receivables, and what payment terms or limits should management consider?',
      data: 'Outstanding receivables, invoice aging, payment history, public customer information.', steps: ['Measure concentration and aging','Research public customer information','Create internal risk flags','Suggest terms/limits for review'],
      deliver: 'Risk dashboard, credit assessment framework, memo', careers: ['credit','portfolio','fintechRisk'], skills: ['credit','accounting','communication'],
      honest: 'This is commercial risk analysis — not securities portfolio management. Label it honestly.' },
    { id: 'mkPricing', source: 'real', title: 'Pricing & quotation strategy', r: [5,4,4,1], dur: '3–5 weeks',
      q: 'Where could quoting and pricing improve, given cost, margin, order size and win/loss history?',
      data: 'Historic quotations, win/loss, cost and margin.', steps: ['Analyze quotes vs outcomes','Coordinate with sales, production, engineering','Identify pricing improvements'],
      deliver: 'Excel quotation model, pricing framework, recommendations', careers: ['strategy','mgmtConsult','fpa','rotational'], skills: ['commercial','marketSizing','communication'] },
    { id: 'mkExpand', source: 'real', title: 'New-market expansion', r: [5,3,4,1], dur: '4–6 weeks',
      q: 'Which segments and prospects should be prioritised, considering competitors, delivered cost and logistics?',
      data: 'Public market research; company capabilities (to confirm).', steps: ['Segment markets','Research competitors and prospects','Estimate delivered cost and logistics','Prioritise opportunities'],
      deliver: 'Market research, target-company list, go-to-market presentation', careers: ['mgmtConsult','strategy','rotational','clientSvc'], skills: ['marketSizing','communication','caseSkills'] },
    { id: 'mkForecast', source: 'real', title: 'Forecasting & scenario planning', r: [4,5,2,2], dur: '3–4 weeks',
      q: 'How do demand, input costs, FX and shipping change the next 12 months?',
      data: 'Historic demand and cost drivers.', steps: ['Document assumptions','Model drivers','Build base / upside / downside'],
      deliver: '12-month forecast with scenarios', careers: ['fpa','invResearch','credit'], skills: ['valuation','excel','accounting'] },
    { id: 'mkO2D', source: 'real', title: 'Order-to-delivery process improvement', r: [4,2,5,1], dur: '3–5 weeks',
      q: 'Where are the delays, handoffs and communication gaps from request to shipping?',
      data: 'Interviews with each department; cycle-time records if available.', steps: ['Interview departments','Map request → production → quality check → delivery','Identify delays and gaps'],
      deliver: 'Process map, KPI dashboard, implementation proposal', careers: ['productOps','rotational','mgmtConsult','strategy'], skills: ['processKpi','coordination','communication'] },
    { id: 'mkCapex', source: 'real', title: 'Equipment investment feasibility', r: [4,5,3,2], dur: '3–4 weeks',
      q: 'Only if a real capex decision exists: does a machine / automation purchase pay back?',
      data: 'Cost, capacity, savings and incremental revenue estimates.', steps: ['Define the decision','Model payback, ROI, NPV/IRR','Run sensitivities'],
      deliver: 'Capex business case and Excel investment model', careers: ['invResearch','fpa','credit','invConsult'], skills: ['valuation','accounting','excel'] },
    { id: 'mkCoord', source: 'real', title: 'Customer project coordination', r: [3,1,5,1], dur: '4–8 weeks',
      q: 'Own an agreed small set of projects: milestones, follow-ups and status updates.',
      data: 'Open customer projects and their milestones.', steps: ['Agree scope','Track milestones','Follow up production/engineering','Prepare approved customer updates'],
      deliver: 'Tracking system, status reports, KPI review', careers: ['productOps','clientSvc','rotational'], skills: ['coordination','projectMgmt','communication'] },
    { id: 'mkCombined', source: 'real', title: 'Combined: Customer Portfolio, Profitability & Commercial Strategy', r: null, dur: '6–8 weeks',
      q: 'If management needs all three: profitability, credit risk and pricing. Otherwise start with one narrow workstream.',
      data: 'Authorized revenue, cost, order, quote and payment history.',
      steps: ['Wk 1 discovery: scope, sponsor, data permission','Wk 2 collect and reconcile data','Wk 3 profitability and margin drivers','Wk 4 customer concentration and receivables risk','Wk 5 pricing and mix opportunities','Wk 6 management presentation and next steps','Wk 7–8 optional pilot and tracking'],
      deliver: 'Trustworthy model with documented assumptions; management recommendations', careers: ['rotational','strategy','fpa','credit'], skills: ['commercial','valuation','communication'] },
    { id: 'pubResearch', source: 'public', title: 'Public company investment research', r: null, dur: '10–15 hours',
      q: 'What is the business model, how profitable is it, and what is it worth?', data: 'Public filings.', steps: ['Business model & competitors','Revenue & profitability','Growth & valuation','Excel model'],
      deliver: 'Excel model and 2-page thesis', careers: ['invResearch','portfolio','clientSvc'], skills: ['accounting','valuation','communication'] },
    { id: 'pubCredit', source: 'public', title: 'Commercial credit assessment', r: null, dur: '8–12 hours',
      q: 'Could a public company repay a hypothetical loan?', data: 'Public filings.', steps: ['Debt and liquidity','Cash flow','Repayment capacity'],
      deliver: '2-page credit memo', careers: ['credit','fintechRisk'], skills: ['credit','accounting'] },
    { id: 'pubFintech', source: 'public', title: 'Fintech strategy comparison', r: null, dur: '8–12 hours',
      q: 'Compare three public fintech companies: models, segments, revenue, positioning.', data: 'Public information.', steps: ['Business models','Segments & revenue','Positioning'],
      deliver: '6–8 slide strategy deck', careers: ['mgmtConsult','strategy','rotational','fintechRisk'], skills: ['marketSizing','communication'] },
    { id: 'pubPortfolio', source: 'public', title: 'Hypothetical institutional portfolio recommendation', r: null, dur: 'To estimate',
      q: 'Given a risk tolerance and objectives, what allocation, benchmark and managers?', data: 'Public fund and market data.', steps: ['Define objectives','Allocation & benchmark','Manager evaluation'],
      deliver: 'Recommendation memo and slides', careers: ['invConsult','portfolio'], skills: ['portfolio','communication'] },
    { id: 'pubBudget', source: 'public', title: '12-month budget, forecast & variance analysis', r: null, dur: 'To estimate',
      q: 'Build a budget for a fictional or public company and explain variances.', data: 'Public or hypothetical.', steps: ['Budget','Forecast','Variance'],
      deliver: 'Excel workbook and summary', careers: ['fpa'], skills: ['valuation','accounting'] },
    { id: 'pubProcess', source: 'public', title: 'Process map with KPIs and improvements', r: null, dur: 'To estimate',
      q: 'Map a process you know and propose measurable improvements.', data: 'Your own observations.', steps: ['Map','Define KPIs','Propose changes'],
      deliver: 'Process map and proposal', careers: ['strategy','productOps','rotational'], skills: ['processKpi'] },
    { id: 'pubPlan', source: 'public', title: 'Project plan with milestones & dependencies', r: null, dur: 'To estimate',
      q: 'Plan a small project with owners, risks and status reporting.', data: 'Self-defined.', steps: ['Milestones','Dependencies','Status report template'],
      deliver: 'Project plan', careers: ['productOps','rotational'], skills: ['projectMgmt','coordination'] }
  ];

  var companies = {
    advisory: { label: 'Institutional advisory', names: ['Cambridge Associates','Mercer/Marsh','Aon','WTW','Callan','NEPC','Russell Investments'] },
    asset: { label: 'Asset management', names: ['BlackRock','Fidelity','PIMCO','Vanguard','Capital Group','Wellington','T. Rowe Price','PGIM','Franklin Templeton','State Street','Morningstar','MSCI','Dimensional','Northern Trust'] },
    fintech: { label: 'Fintech (screen daily coding intensity)', names: ['Credit Karma','Intuit','Affirm','Kikoff','SoFi','Chime','Upstart','LendingClub','Robinhood','Wealthfront','Betterment','Stripe','Block','PayPal','Plaid','Brex','Ramp','Experian','FICO','TransUnion','Visa','Mastercard'] },
    banks: { label: 'Banks & ratings', names: ['Capital One','JPMorgan Chase','Goldman Sachs','Morgan Stanley','Bank of America','Wells Fargo','Citi','Barclays','UBS','HSBC','Deutsche Bank','American Express','Moody’s','S&P Global','Fitch','Citizens','U.S. Bank','East West Bank','Western Alliance','First Citizens/SVB','Stifel','Crédit Agricole'] },
    consulting: { label: 'Consulting (verify economics/data needs and travel)', names: ['Analysis Group','Cornerstone Research','Brattle','CRA','NERA','Compass Lexecon','BRG','Kroll','FTI','Deloitte','EY-Parthenon','PwC/Strategy&','KPMG','Oliver Wyman','Accenture','McKinsey','BCG','Bain'] }
  };

  var leads = [];

  // auto: ticked by the app from the guided journey; the rest are manual.
  var tasks = [
    { id: 'a1', week: 1, text: 'Answer the discovery questions so your paths fit you.', go: 'discover', auto: 'discover' },
    { id: 'a2', week: 1, text: 'Pick your top 2–3 paths (in My journey).', go: 'narrow', auto: 'paths' },
    { id: 't1c', week: 1, text: 'Recover evidence from your internship or school work using the prompts on Readiness.' },
    { id: 't1d', week: 1, text: 'Make one résumé version aimed at your first path.' },
    { id: 't1e', week: 1, text: 'Update your LinkedIn headline and summary to match that résumé.' },
    { id: 'a6', week: 2, text: 'Start one project or course to fill your biggest gap (Build → Fill the gaps).', go: 'improve', auto: 'build' },
    { id: 't2b', week: 2, text: 'Ask three people for a 15-minute chat about your paths: alumni, career services, friends of family.' },
    { id: 'a8', week: 2, text: 'Add roles you have verified to your tracker.', go: '#my-tracker', auto: 'tracker' },
    { id: 't2d', week: 2, text: 'Apply to a first batch of roles. Verify each on the official careers page.', go: '#find-roles' },
    { id: 'a10', week: 3, text: 'Finish a project and write up what you found.', go: 'improve', auto: 'projDone' },
    { id: 't3b', week: 3, text: 'Write three short stories for interviews: a problem, what you did, the result.' },
    { id: 't3c', week: 3, text: 'Follow up on applications you sent a week ago, and keep applying.', go: '#my-tracker' },
    { id: 't4a', week: 4, text: 'Add what you really did to your résumé. Only real work.' },
    { id: 't4b', week: 4, text: 'Practice interview questions for your top path.' },
    { id: 't4c', week: 4, text: 'Reflect: what energized you and what drained you? Re-answer Discover if it changed.', go: 'discover' }
  ];

  var resumeVersions = [
    { id: 'A', name: 'A — Investment / research / portfolio / advisory', for: ['invConsult','invResearch','portfolio','clientSvc'] },
    { id: 'B', name: 'B — Credit / corporate finance', for: ['credit','fpa','fintechRisk'] },
    { id: 'C', name: 'C — Business / strategy / operations / rotations', for: ['strategy','rotational','productOps','mgmtConsult'] }
  ];

  var internshipPrompts = [
    'Who did you coordinate with?', 'What did you schedule?', 'Did you follow up on deliverables?', 'Did you gather requirements?',
    'Did you communicate with business teams or customers?', 'Did your analysis influence a decision?', 'What problem did you identify?',
    'How did you manage deadlines?', 'What was the actual duration and what outcomes can you confirm?'
  ];

  var bulletExamples = [
    { before: 'Helped with reports.', after: 'Prepared weekly reports for [team], cutting [task] time by [real figure, if known].' },
    { before: 'Worked on data analysis for a project.', after: 'Analyzed [what data] to answer [question]; presented [finding] to [audience].' }
  ];

  var futureBullets = [
    'Analyzed [real data] to evaluate [question]; found [actual finding].',
    'Built an Excel model to compare [options] under [scenarios].',
    'Collaborated with [teams] to identify [improvement].',
    'Presented findings to [audience]; [actual decision or outcome, only if confirmed].'
  ];

  var titleTrap = [
    ['Low coding', 'Corporate financial analyst, commercial credit analyst / underwriter'],
    ['Low–moderate', 'Investment research, operations, strategy'],
    ['Moderate–high', 'Product analytics, growth analytics, consumer credit strategy'],
    ['High', 'Credit risk modeling, decision scientist, data analyst']
  ];
  var screenSignals = ['SQL required','Python / R','Predictive modeling','Querying large datasets','A/B testing','Data transformation'];
  var weekQuestions = ['What share of a typical week is coding?','…customer work?','…Excel analysis?','…meetings?','…independent research?'];

  return { profile: profile, prefilled: false, activities: activities, seedPrefs: seedPrefs, roles: roles, skills: skills, learning: learning, projects: projects,
    companies: companies, leads: leads, tasks: tasks, resumeVersions: resumeVersions, internshipPrompts: internshipPrompts,
    bulletExamples: bulletExamples, futureBullets: futureBullets, titleTrap: titleTrap, screenSignals: screenSignals, weekQuestions: weekQuestions };
})();
