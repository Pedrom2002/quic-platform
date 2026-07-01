// ONE-SHOT: add all ActivoBank Lounge contacts to newsletter list. Delete after use.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const LIST_ID = '8b2bacaa-3178-42bb-bf1a-dcf0744c6e3d'
const ONE_SHOT_TOKEN = 'add-activobank-contacts-2026'

const ALL_EMAILS = ["abnermoreno@gmail.com","aderitodimingos.9@gmail.com","afonsoventuzelos@gmail.com","afonso.cr.monteiro@gmail.com","alexandrerua4@gmail.com","alex93_nike@hotmail.com","alexsma7@hotmail.com","alexandredias221094@gmail.com","djalodjery2023@gmail.com","allanteix@outlook.com","anajuliaerodrigues@gmail.com","paulagomes0311@hotmail.com","paulasjr1968@gmail.com","cardosobelinha28@gmail.com","apfolha@gmail.com","anas.afirrahh@gmail.com","angela@mundunobu.org","anthony.nimpa23@gmail.com","antoningoosse@gmail.com","ajm_lourenco@hotmail.com","antoniofradepina@gmail.com","antoniosantos198268@gmail.com","menezesdegarcia@gmail.com","armando93931@gmail.com","maraca.2005.f@gmail.com","osman.asgad@gmail.com","ashtarkt@gmail.com","josejaab@gmail.com","mercraudaurelien@gmail.com","cohez.bastien@gmail.com","beaisa85@gmail.com","beaafliipaa07@icloud.com","benibilis@gmail.com","bennouna.mounia@gmail.com","bernardo.abrantes@hotmail.com","bikky.stha1@gmail.com","brendasilvalunaliens@gmail.com","cansu_cc@hotmail.de","carlagarcia84@icloud.com","multiservicioscorga@hotmail.com","charlie.ga29@gmail.com","carlovsc@gmail.com","felixcarlos0908@gmail.com","carolegosselin@live.fr","carolcervino@gmail.com","carolina.batista2003@gmail.com","catarina.herzog@hotmail.com","catiuscacascao@gmail.com","henning.schulze@dslissabon.com","cidaliajsantos@gmail.com","claucami21@gmail.com","claudiadieb@hotmail.com","claudiareis1011@gmail.com","hochmanclaudio@gmail.com","clive.balisier@gmail.com","claudiacorreiapires@hotmail.com","danielcostantino01@gmail.com","ccjoon@icloud.com","cristinacorona7@gmail.com","cynthiaferreira26@hotmail.com","damlag.00@hotmail.com","daneil.passalio@gmail.com","danieladferreira2006@gmail.com","andremrc@hotmail.it","dvdfranco6@gmail.com","davosandovalpt@gmail.com","david.franco.pinheiro@gmail.com","denis.barbateau@gmail.com","diegors_2102@hotmail.com","dinamanso@gmail.com","diimonteiro7@hotmail.com","bdrouet@hotmail.com","duarte8afonso@gmail.com","ejassat786@gmail.com","edenilsonpedrodossantose@gmail.com","edmarn@gmail.com","ednaldo_felipe@hotmail.com","a20131074@agepm.pt","eduardodfilho.057@gmail.com","eglantine7@live.com","elipantaa@gmail.com","emanuelecalado@gmail.com","borisenard@gmail.com","enzomzc1@gmail.com","ericamartins050@gmail.com","erick.nava.hdez@gmail.com","aldineiroseideba@gmail.com","embc_1@hotmail.com","mushu172@gmail.com","evhendubrov@gmail.com","fabiodasilvabarros21@gmail.com","busines57@hotmail.com","fabiola.panetti0@gmail.com","fatima13bispo@gmail.com","feducho@mail.com","ftrigueros2@gmail.com","frota_lukyy@hotmail.com","felipe_dias-01@hotmail.com","fergabundez@gmail.com","fernanda_c.sousa2@hotmail.com","fernandacaroline@hotmail.com.br","fernando.jorge.luz@sapo.pt","filipavcortes@outlook.pt","francescatumiatti5@gmail.com","francisca.roldao@tumo.world","10franciscobonifacio2009@gmail.com","ele.siqueira@gmail.com","fredy_cordeiro_9@hotmail.com","g4bryrm98@gmail.com","gabrielnc6@gmail.com","gabrielpereraferraz@gmail.com","obegagastao66@gmail.com","dasilvageraldo74@gmail.com","ghita.thiyfa@skema.edu","goncalo28santos2007@gmail.com","goncalodslalves@gmail.com","gongasantunes2008@gmail.com","gui.costa09@hotmail.com","guiarranhado@gmail.com","guilhermemaggessi30@gmail.com","guimarquesoliveira@gmail.com","guilhermesullivan2008@gmail.com","hugoleonardocabral805@gmail.com","hrafaelsoares83@gmail.com","hrodrigosilva17@gmail.com","inesfradiquebastos@gmail.com","izabela.gajewska2000@gmail.com","janahohenfeld7@gmail.com","jekas170322@gmail.com","joanamachado.17@hotmail.com","joanapina04@outlook.com","joana96_silva@hotmail.com","joannadragon384@gmail.com","hurrahs.94-law@icloud.com","joao-alves-28@hotmail.com","joaobonifacio@gmail.com","putopersie@gmail.com","joaoseixasgrh@gmail.com","joaorooliveira04@gmail.com","joaopiresc@gmail.com","joaovirote@gmail.com","joaovieira.vitor8880@gmail.com","jonathanibarracoronel@gmail.com","jorge.moura@live.com","ricardo.nunes.1912@gmail.com","simple.personal@gmail.com","juliocrv20@gmail.com","jr.rosa01@gmail.com","keciacarolyneee@gmail.com","stoyan.kristina@hotmail.com","jiecoryi3@gmail.com","batatasmoms7@gmail.com","lixfat@gmail.com","laura00romeirosantos@gmail.com","lauracristinaas@gmail.com","puillelaureline@gmail.com","leandrofenix@gmail.com","leila.koweindl@bluewin.ch","leilaneb@hotmail.com","29500@aefernandopessoa.edu.pt","leolimatvde@gmail.com","leonorkkribeiro@gmail.com","leticialeaos.20@gmail.com","liliana@mundunobu.org","lilianapaw@gmail.com","lisachf@gmx.de","gushier.edict4e@icloud.com","suarezcerda@gmail.com","luciana@soperimoveis.com.br","luiscrodriguesmorais@gmail.com","luizatfernandes@gmail.com","mavucovix@gmail.com","mm.veigagomes7@gmail.com","mldigital77@gmail.com","maialopes19@gmail.com","mbayemar@hotmail.com","marcos33@live.com.pt","mdssilva26@gmail.com","marcos.lpz99@hotmail.com","margaridat1997@gmail.com","guidaoliveira123@gmail.com","margarida.correia121@gmail.com","margaridasnogueira@hotmail.com","mariatrabalhos29@gmail.com","duartemariag2@gmail.com","maryangelbohorquez25@gmail.com","claraalvescanutto@gmail.com","lahorademariangel@gmail.com","ms.alves.moreiraa@gmail.com","mlqo1756@gmail.com","chilpa_chole@hotmail.com","marianaayalab@gmail.com","mario2011roldao@gmail.com","mario00carvalho@gmail.com","marta.c.fernandes2006@gmail.com","martimcharrua.mc@gmail.com","martimcardoso112011@gmail.com","mathisgia16@gmail.com","matildaaaw@gmail.com","mmbgodinho@gmail.com","maurocgil@gmail.com","wildfeat@yandex.ru","miguelandradepais@gmail.com","m.astronomia@icloud.com","mireillemorones@yahoo.com","miriamsv02@gmail.com","mahannan.pt@gmail.com","kickmhk@gmail.com","tribak.m@gmail.com","muriellegaspar@hotmail.com","nahidsangany@gmail.com","natalia.rrm@hotmail.com","natylisboa02@gmail.com","nathalyaleaal@outlook.com","nikolaitsmee@gmail.com","ngpocas@gmail.com","nuno.c.alf@gmail.com","gnuno122@gmail.com","nunneves@icloud.com","osvaldocinelo@hotmail.com","patriciacorreia.2411@gmail.com","patricio.briones.r@hotmail.cl","pgrato@sapo.pt","pfigueiredo2006@gmail.com","pedrohjuniiorbio@gmail.com","peter.tarrana@gmail.com","pmalheiro8@gmail.com","pedro18castro@gmail.com","pedrofcf11@gmail.com","ph.mcosta@hotmail.com","pedromendescatij1998@gmail.com","progpedro@gmail.com","pmpereira@tap.pt","nogueirapires@gmail.com","rafaelraimundoa03@gmail.com","rodriguessraphalea@gmail.com","rebecafsillva@gmail.com","jasmim.rw@outlook.com","rbnogueira1970@gmail.com","dinorija@gmail.com","ritamrc18@gmail.com","anaritasaias@gmail.com","ritasantos1893@hotmail.com","rodmiguel23@gmail.com","24rodrioliveira@gmail.com","rodrigoamaro2006@gmail.com","r.koweindl@bluewin.ch","roshnanaylia123@icloud.com","ruanda.tavares94@gmail.com","rui.simsim52@gmail.com","ruxsousa@gmail.com","sandrafaisca71@hotmail.com","luso30@sapo.pt","s.boanova.s@gmail.com","saraassismacedo@gmail.com","sendhys@gmail.com","sermagalhaes@gmail.com","camarasheirif784@gmail.com","simaoserafim2005@gmail.com","sofiiherrera03@gmail.com","sofiia.canario@gmail.com","sofiamarquesx@gmail.com","garcarso@hotmail.com","steniosantos111@gmail.com","susana_ferreira795@hotmail.com","tai.ramona@gmail.com","tatiana_c@sapo.pt","telma.lm.pereira@gmail.com","tbonnet934@gmail.com","tiago.rosado13@gmail.com","tiagoquaresmanovais@gmail.com","tomaspita19@gmail.com","trischna.martins@gmail.com","umarojau77@gmail.com","vanda.morna@gmail.com","vdini.vd@gmail.com","verarocha95@hotmail.com","vicente-corte-vieira@hotmail.com","victor.ariel.rivera20@gmail.com","victoriaguimas@gmail.com","vitorrodrigueseuw@gmail.com","vitorhnunes@icloud.com","vivyehenry@gmail.com","aortizloaiza@gmail.com","iararodrigues233@gmail.com","triptofo@gmail.com"]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== ONE_SHOT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: list } = await supabase
    .from('marketing_lists')
    .select('organization_id')
    .eq('id', LIST_ID)
    .single()

  if (!list) return NextResponse.json({ error: 'list not found' }, { status: 404 })

  const seen = new Set<string>()
  const rows = ALL_EMAILS
    .map(e => e.toLowerCase().trim())
    .filter(e => {
      if (seen.has(e)) return false
      seen.add(e)
      return true
    })
    .map(email => ({
      list_id: LIST_ID,
      email,
      organization_id: list.organization_id,
      status: 'active' as const,
    }))

  const { error } = await supabase
    .from('marketing_contacts')
    .upsert(rows, { onConflict: 'list_id,email', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ upserted: rows.length, list_id: LIST_ID })
}
