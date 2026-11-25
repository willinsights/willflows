import { describe, it, expect } from 'vitest';
import { getReportCostBreakdown } from '../reportCostBreakdown';
import { buildActivityProjects } from '../activityReport';
const project = { id:'p1', name:'Vídeo', project_code:'P1', type:'video', clients:{name:'Cliente'}, agreed_value:48, custo_captacao:0, custo_edicao:30, custos_extras:0, custos_extras_payment_status:null, custos_extras_paid_at:null, is_delivered:true, delivered_at:'2026-11-20', delivery_date:null, shoot_date:null, created_at:'2026-10-01', client_payment_status:null, client_paid_at:null, competence_month:'2026-11' };
const range = {start:new Date(2026,10,1),end:new Date(2026,10,30)};
describe('current activity and consolidated cost report', () => {
 it('includes the 30 euro editing cost even without detailed cost lines', () => {
  expect(getReportCostBreakdown([project],[],range)).toEqual([{category:'edicao',label:'Edição',actual:30,estimated:null,count:1}]);
 });
 it('activity uses the delivered card price 48, cost 30 and profit 18', () => {
  expect(buildActivityProjects([project],[],[])[0]).toMatchObject({id:'p1',receita:48,custo:30,lucro:18,ano:2026,mes:'11'});
 });
 it('excludes undelivered cards and other competence months', () => {
  expect(getReportCostBreakdown([{...project,is_delivered:false},{...project,id:'old',competence_month:'2026-10'}],[],range)).toEqual([]);
  expect(buildActivityProjects([{...project,is_delivered:false}],[],[])).toEqual([]);
 });
 it('adds a detailed cost once without replacing or duplicating people costs', () => {
  const line = {id:'l1',project_id:'p1',actual_amount:5,estimated_amount:4,category:'software',payment_status:'pendente',paid_at:null};
  expect(getReportCostBreakdown([project],[line,line],range).reduce((s,r)=>s+r.actual,0)).toBe(35);
  expect(buildActivityProjects([project],[line,line],[])[0].lucro).toBe(13);
 });
});