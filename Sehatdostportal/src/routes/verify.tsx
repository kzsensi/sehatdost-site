import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Upload, FileCheck2, Sparkles, User, Phone, MapPin, Hospital, ShieldPlus, Activity, ScanLine, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AIProcessingOverlay } from "@/components/AIProcessingOverlay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { findBestProcedure, searchProcedures, type ProcedureMaster } from "@/lib/procedure-match";
import { findBestDisease, searchDiseases, type DiseaseMaster } from "@/lib/disease-match";
import { useAuth } from "@/lib/auth-context";

type PolicyRow = {
  id: string;
  insurer_name: string;
  policy_name: string;
  uin_number: string;
  policy_type: string;
};

const MOCK_POLICIES: PolicyRow[] = [
  {
    id: "mock-pmjay",
    insurer_name: "Ayushman Bharat (PM-JAY)",
    policy_name: "National Health Protection Scheme",
    uin_number: "NHPS-PMJAY-2026",
    policy_type: "Government Scheme"
  },
  {
    id: "mock-hdfc",
    insurer_name: "HDFC ERGO",
    policy_name: "Optima Secure Health Insurance",
    uin_number: "HDFCHIP21199V022021",
    policy_type: "Commercial Insurance"
  },
  {
    id: "mock-star",
    insurer_name: "Star Health",
    policy_name: "Family Health Optima Insurance",
    uin_number: "SHAHLIP21147V042021",
    policy_type: "Commercial Insurance"
  },
  {
    id: "mock-icici",
    insurer_name: "ICICI Lombard",
    policy_name: "Complete Health Insurance",
    uin_number: "ICIHLIP21142V032021",
    policy_type: "Commercial Insurance"
  }
];

const MOCK_POLICY_DATA: Record<string, any> = {
  "mock-pmjay": {
    policy_identity: {
      insurer_name: "Ayushman Bharat (PM-JAY)",
      policy_name: "National Health Protection Scheme",
      uin_number: "NHPS-PMJAY-2026",
      entry_age: "0-100 years",
    },
    coverage_intelligence: {
      room_rent_limit: "General Ward Covered (No limit for PM-JAY packages)",
      icu_limit: "Covered",
      ambulance_cover: "Up to ₹250 per referral",
      organ_donor_cover: "Covered as per package rules",
      ayush_cover: "Covered in empaneled public hospitals",
      daycare_procedures: "All daycare packages covered"
    },
    waiting_periods: {
      initial_waiting_period: "No waiting period (Day 1 cover)",
      pre_existing_disease_waiting: "No waiting period for PED",
      specific_disease_waiting: "No waiting period",
      maternity_waiting_period: "No waiting period"
    },
    claim_intelligence: {
      cashless_available: "Yes (100% Cashless)",
      reimbursement_available: "No",
      pre_auth_required: "Yes (for specific packages)",
      claim_submission_deadline: "Within 24 hours of admission",
      claim_settlement_timeline: "15 days"
    },
    hospital_workflow_intelligence: {
      hospital_empanelment_required: "Yes (NHA empaneled only)",
      tpa_required: "No",
      government_authorization_required: "Yes (pre-auth via TMS)",
      package_code_required: "Yes"
    },
    benefits: [
      "Inpatient treatment and daycare",
      "Pre-hospitalization up to 3 days",
      "Post-hospitalization up to 15 days",
      "Medicines, consumables, diagnostics"
    ],
    exclusions: [
      "Cosmetic surgery",
      "Outpatient diagnostic checks without admission",
      "Experimental treatments"
    ],
    mandatory_documents: [
      "PM-JAY Golden Card / Ayushman Card",
      "Aadhaar Card or Government Photo ID",
      "Discharge Summary",
      "Pre-authorization Approval Letter"
    ]
  },
  "mock-hdfc": {
    policy_identity: {
      insurer_name: "HDFC ERGO",
      policy_name: "Optima Secure Health Insurance",
      uin_number: "HDFCHIP21199V022021",
      entry_age: "18-65 years",
    },
    coverage_intelligence: {
      room_rent_limit: "Single Private A/C Room (No capping)",
      icu_limit: "No Limit",
      ambulance_cover: "Road Ambulance covered up to actuals, Air Ambulance up to ₹10 Lakhs",
      organ_donor_cover: "Covered up to sum insured",
      ayush_cover: "Covered up to sum insured",
      daycare_procedures: "All daycare procedures covered"
    },
    waiting_periods: {
      initial_waiting_period: "30 days (accidents excluded)",
      pre_existing_disease_waiting: "36 months",
      specific_disease_waiting: "24 months",
      maternity_waiting_period: "No maternity coverage"
    },
    claim_intelligence: {
      cashless_available: "Yes",
      reimbursement_available: "Yes",
      pre_auth_required: "Yes (for planned admission)",
      claim_submission_deadline: "Within 15 days of discharge",
      claim_settlement_timeline: "30 days"
    },
    hospital_workflow_intelligence: {
      hospital_empanelment_required: "Yes (for cashless)",
      tpa_required: "Yes",
      government_authorization_required: "No",
      package_code_required: "No"
    },
    benefits: [
      "Secure Benefit (doubles sum insured from day 1)",
      "Plus Benefit (up to 100% no claim bonus)",
      "Restore Benefit (unlimited restoration of sum insured)",
      "Daily hospital cash option available"
    ],
    exclusions: [
      "Adventure sports injuries",
      "Self-inflicted injuries",
      "Weight loss treatment"
    ],
    mandatory_documents: [
      "Health Card / Policy Schedule",
      "KYC (Aadhaar / PAN)",
      "Discharge Summary",
      "Detailed Hospital Bill",
      "Investigation Reports"
    ]
  },
  "mock-star": {
    policy_identity: {
      insurer_name: "Star Health",
      policy_name: "Family Health Optima Insurance",
      uin_number: "SHAHLIP21147V042021",
      entry_age: "18-65 years",
    },
    coverage_intelligence: {
      room_rent_limit: "Up to ₹5,000 per day (Single standard A/C room)",
      icu_limit: "Actual expenses covered",
      ambulance_cover: "Road ambulance up to ₹750 per hospitalization",
      organ_donor_cover: "Up to 10% of sum insured",
      ayush_cover: "Up to ₹25,000 per policy period",
      daycare_procedures: "Specified daycare procedures covered"
    },
    waiting_periods: {
      initial_waiting_period: "30 days",
      pre_existing_disease_waiting: "36 months",
      specific_disease_waiting: "24 months",
      maternity_waiting_period: "Not applicable"
    },
    claim_intelligence: {
      cashless_available: "Yes",
      reimbursement_available: "Yes",
      pre_auth_required: "Yes",
      claim_submission_deadline: "Within 15 days of discharge",
      claim_settlement_timeline: "30 days"
    },
    hospital_workflow_intelligence: {
      hospital_empanelment_required: "Yes",
      tpa_required: "Yes",
      government_authorization_required: "No",
      package_code_required: "No"
    },
    benefits: [
      "Automatic restoration of sum insured",
      "Recharge benefit",
      "Assisted reproduction treatment coverage",
      "Compassionate travel cover"
    ],
    exclusions: [
      "Dental treatments unless caused by accident",
      "Hearing aids and contact lenses",
      "Pregnancy and childbirth complications"
    ],
    mandatory_documents: [
      "Star Health Card / ID",
      "Aadhaar / Voter ID card",
      "Discharge Summary",
      "Diagnostic Reports",
      "Prescriptions and pharmacy bills"
    ]
  },
  "mock-icici": {
    policy_identity: {
      insurer_name: "ICICI Lombard",
      policy_name: "Complete Health Insurance",
      uin_number: "ICIHLIP21142V032021",
      entry_age: "18-65 years",
    },
    coverage_intelligence: {
      room_rent_limit: "No capping for standard single room",
      icu_limit: "Covered in full",
      ambulance_cover: "Road ambulance covered up to ₹10,000 per event",
      organ_donor_cover: "Covered up to sum insured",
      ayush_cover: "Up to sum insured",
      daycare_procedures: "All daycare treatments covered"
    },
    waiting_periods: {
      initial_waiting_period: "30 days",
      pre_existing_disease_waiting: "24 months",
      specific_disease_waiting: "24 months",
      maternity_waiting_period: "36 months (optional rider)"
    },
    claim_intelligence: {
      cashless_available: "Yes",
      reimbursement_available: "Yes",
      pre_auth_required: "Yes",
      claim_submission_deadline: "Within 30 days of discharge",
      claim_settlement_timeline: "15 days"
    },
    hospital_workflow_intelligence: {
      hospital_empanelment_required: "Yes",
      tpa_required: "Yes",
      government_authorization_required: "No",
      package_code_required: "No"
    },
    benefits: [
      "Reset benefit for sum insured",
      "Donor expenses covered",
      "Wellness rewards program",
      "Pre and post hospitalization (60 and 90 days)"
    ],
    exclusions: [
      "External congenital anomalies",
      "Sterility and venereal diseases",
      "Treatment for alcoholism / drug abuse"
    ],
    mandatory_documents: [
      "ICICI Health Card",
      "PAN Card / Aadhaar Card",
      "Discharge Summary",
      "Detailed Itemized Bill",
      "Original payment receipts"
    ]
  }
};

const MOCK_PROCEDURES: ProcedureMaster[] = [
  {
    id: "proc-cabg",
    procedure_code: "CABG",
    procedure_name: "Coronary Artery Bypass Grafting (CABG)",
    short_name: "CABG",
    specialty: "Cardiology",
    category: "Surgical",
    synonyms: ["cardiac bypass", "heart bypass", "bypass surgery"],
    keywords: ["heart", "bypass", "coronary", "cabg"],
    inpatient_required: true,
    daycare_possible: false,
    status: "active",
    pmjay_package_code: "SG021"
  },
  {
    id: "proc-dialysis",
    procedure_code: "MHD",
    procedure_name: "Maintenance Hemodialysis",
    short_name: "Hemodialysis",
    specialty: "Nephrology",
    category: "Daycare",
    synonyms: ["dialysis", "hemodialysis", "kidney dialysis"],
    keywords: ["dialysis", "kidney", "renal", "mhd"],
    inpatient_required: false,
    daycare_possible: true,
    status: "active",
    pmjay_package_code: "MC003"
  },
  {
    id: "proc-laparotomy",
    procedure_code: "LAP",
    procedure_name: "Exploratory Laparotomy and Perforation Repair",
    short_name: "Laparotomy",
    specialty: "General Surgery",
    category: "Emergency Surgical",
    synonyms: ["laparotomy", "exploratory laparotomy", "perforation repair"],
    keywords: ["abdominal", "laparotomy", "perforation", "repair"],
    inpatient_required: true,
    daycare_possible: false,
    status: "active",
    pmjay_package_code: "SG054"
  },
  {
    id: "proc-cataract",
    procedure_code: "CAT",
    procedure_name: "Cataract Surgery with IOL",
    short_name: "Cataract",
    specialty: "Ophthalmology",
    category: "Daycare",
    synonyms: ["cataract", "cataract extraction", "lens replacement"],
    keywords: ["eye", "lens", "cataract", "iol"],
    inpatient_required: false,
    daycare_possible: true,
    status: "active",
    pmjay_package_code: "OP012"
  },
  {
    id: "proc-tkr",
    procedure_code: "TKR",
    procedure_name: "Total Knee Replacement",
    short_name: "Knee Replacement",
    specialty: "Orthopedics",
    category: "Surgical",
    synonyms: ["knee replacement", "total knee replacement", "tkr"],
    keywords: ["joint", "knee", "replacement", "arthroplasty"],
    inpatient_required: true,
    daycare_possible: false,
    status: "active",
    pmjay_package_code: "SG092"
  }
];

const MOCK_DISEASES: DiseaseMaster[] = [
  {
    id: "dis-ckd",
    disease_code: "N18.5",
    disease_name: "Chronic Kidney Disease Stage 5 (CKD-5)",
    short_name: "CKD Stage 5",
    specialty: "Nephrology",
    category: "Renal",
    synonyms: ["ckd", "kidney failure", "end stage renal disease", "esrd"],
    keywords: ["kidney", "renal", "ckd", "failure"],
    icd10_code: "N18.5",
    chronic_flag: true,
    critical_illness_flag: true,
    status: "active"
  },
  {
    id: "dis-t2dm",
    disease_code: "E11",
    disease_name: "Type 2 Diabetes Mellitus",
    short_name: "Diabetes",
    specialty: "Endocrinology",
    category: "Metabolic",
    synonyms: ["diabetes", "t2dm", "sugar", "diabetic"],
    keywords: ["diabetes", "sugar", "t2dm", "glucose"],
    icd10_code: "E11",
    chronic_flag: true,
    critical_illness_flag: false,
    status: "active"
  },
  {
    id: "dis-htn",
    disease_code: "I10",
    disease_name: "Essential Hypertension",
    short_name: "Hypertension",
    specialty: "Cardiology",
    category: "Cardiovascular",
    synonyms: ["hypertension", "htn", "high bp", "blood pressure"],
    keywords: ["hypertension", "bp", "pressure", "cardiovascular"],
    icd10_code: "I10",
    chronic_flag: true,
    critical_illness_flag: false,
    status: "active"
  },
  {
    id: "dis-cad",
    disease_code: "I25.1",
    disease_name: "Coronary Artery Disease (CAD)",
    short_name: "CAD",
    specialty: "Cardiology",
    category: "Cardiovascular",
    synonyms: ["cad", "coronary artery disease", "heart disease"],
    keywords: ["heart", "coronary", "cad", "artery"],
    icd10_code: "I25.1",
    chronic_flag: true,
    critical_illness_flag: true,
    status: "active"
  },
  {
    id: "dis-cataract",
    disease_code: "H26.9",
    disease_name: "Senile Cataract",
    short_name: "Cataract",
    specialty: "Ophthalmology",
    category: "Ocular",
    synonyms: ["cataract", "senile cataract"],
    keywords: ["eye", "lens", "cataract"],
    icd10_code: "H26.9",
    chronic_flag: false,
    critical_illness_flag: false,
    status: "active"
  }
];

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { hospitalConfig, isSuperAdmin } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [loadingPolicyData, setLoadingPolicyData] = useState(false);
  const [policyJson, setPolicyJson] = useState<unknown>(null);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [procedure, setProcedure] = useState("");
  const [hospital, setHospital] = useState("");
  const [procedures, setProcedures] = useState<ProcedureMaster[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [disease, setDisease] = useState("");
  const [diseases, setDiseases] = useState<DiseaseMaster[]>([]);
  const [showDiseaseSuggest, setShowDiseaseSuggest] = useState(false);


  useEffect(() => {
    (async () => {
      const [pols, procs, dis] = await Promise.all([
        supabase.from("policies").select("id, insurer_name, policy_name, uin_number, policy_type").order("insurer_name", { ascending: true }),
        supabase.from("procedure_master").select("*").eq("status", "active"),
        (supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: DiseaseMaster[] | null; error: { message: string } | null }> } } }).from("disease_master").select("*").eq("status", "active"),
      ]);
      
      let list = pols.data ?? [];
      if (!isSuperAdmin && hospitalConfig && !hospitalConfig.all_policies) {
        const allowed = new Set(hospitalConfig.enabled_policy_ids ?? []);
        list = list.filter((p) => allowed.has(p.id));
      }
      if (list.length === 0) {
        list = MOCK_POLICIES;
      }
      setPolicies(list);

      let plist = (procs.data ?? []) as ProcedureMaster[];
      if (!isSuperAdmin && hospitalConfig) {
        if (!hospitalConfig.all_specialties) {
          const spec = new Set(hospitalConfig.enabled_specialties ?? []);
          plist = plist.filter((p) => !p.specialty || spec.has(p.specialty));
        }
        if (!hospitalConfig.all_procedure_categories) {
          const cats = new Set(hospitalConfig.enabled_procedure_categories ?? []);
          plist = plist.filter((p) => !p.category || cats.has(p.category));
        }
      }
      if (plist.length === 0) {
        plist = MOCK_PROCEDURES;
      }
      setProcedures(plist);

      let dlist = (dis.data ?? []) as DiseaseMaster[];
      if (!isSuperAdmin && hospitalConfig) {
        if (!hospitalConfig.all_specialties) {
          const spec = new Set(hospitalConfig.enabled_specialties ?? []);
          dlist = dlist.filter((d) => !d.specialty || spec.has(d.specialty));
        }
        if (!hospitalConfig.all_disease_categories) {
          const cats = new Set(hospitalConfig.enabled_disease_categories ?? []);
          dlist = dlist.filter((d) => !d.category || cats.has(d.category));
        }
      }
      if (dlist.length === 0) {
        dlist = MOCK_DISEASES;
      }
      setDiseases(dlist);

      setLoadingPolicies(false);
    })();
  }, [hospitalConfig, isSuperAdmin]);

  const suggestions = useMemo(
    () => (procedure.trim().length >= 2 ? searchProcedures(procedure, procedures, 6) : []),
    [procedure, procedures],
  );
  const diseaseSuggestions = useMemo(
    () => (disease.trim().length >= 2 ? searchDiseases(disease, diseases, 6) : []),
    [disease, diseases],
  );

  const onPolicyChange = async (id: string) => {
    setSelectedPolicyId(id);
    if (id.startsWith("mock-")) {
      setPolicyJson(MOCK_POLICY_DATA[id]);
      const policy = policies.find((p) => p.id === id);
      toast.success(`Loaded ${policy?.policy_name ?? "policy"}`, {
        description: "Mock Policy JSON ready for eligibility verification.",
      });
      return;
    }
    setLoadingPolicyData(true);
    const { data, error } = await supabase
      .from("policy_data")
      .select("data")
      .eq("policy_id", id)
      .maybeSingle();
    setLoadingPolicyData(false);
    if (error) {
      toast.error("Failed to load policy details", { description: error.message });
      return;
    }
    setPolicyJson(data?.data ?? null);
    const policy = policies.find((p) => p.id === id);
    toast.success(`Loaded ${policy?.policy_name ?? "policy"}`, {
      description: data?.data ? "Policy JSON ready for eligibility verification." : "No detailed policy JSON found.",
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) {
      toast.error("Please select an insurance policy");
      return;
    }
    if (!policyJson) {
      toast.error("Policy data not loaded yet. Please re-select the policy.");
      return;
    }
    const policy = policies.find((p) => p.id === selectedPolicyId);
    const match = findBestProcedure(procedure, procedures);
    const dMatch = disease.trim() ? findBestDisease(disease, diseases) : null;
    if (match) {
      toast.success("Procedure matched", {
        description: `${match.procedure.procedure_name} (${match.procedure.procedure_code})`,
      });
    }
    if (dMatch) {
      toast.success("Disease matched", {
        description: `${dMatch.disease.disease_name} (${dMatch.disease.disease_code})`,
      });
    }
    sessionStorage.setItem(
      "sehat:verification",
      JSON.stringify({
        policy,
        policyData: policyJson,
        patient: {
          name: patientName,
          age: typeof age === "number" ? age : Number(age) || 0,
          gender,
          procedure,
          hospital,
          matchedProcedure: match?.procedure ?? null,
          disease: disease || null,
          matchedDisease: dMatch?.disease ?? null,
        },
      }),
    );
    setProcessing(true);
  };


  return (
    <AppShell>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/60 p-6 shadow-card">
            <SectionHeader icon={User} title="Patient Information" subtitle="Basic demographics" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Patient Name">
                <Input placeholder="Patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
              </Field>
              <Field label="Mobile Number">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="+91 ..." defaultValue="+91 98202 11234" required />
                </div>
              </Field>
              <Field label="Age">
                <Input type="number" placeholder="42" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} required />
              </Field>
              <Field label="Gender">
                <RadioGroup value={gender} onValueChange={setGender} className="flex gap-3 pt-2">
                  {["male", "female", "other"].map((g) => (
                    <Label key={g} className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-2 capitalize transition-smooth has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <RadioGroupItem value={g} />
                      {g}
                    </Label>
                  ))}
                </RadioGroup>
              </Field>
            </div>
          </Card>


          <Card className="border-border/60 p-6 shadow-card">
            <SectionHeader icon={ShieldPlus} title="Insurance & Treatment" subtitle="Coverage details" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Insurance Type">
                <Select value={selectedPolicyId} onValueChange={onPolicyChange} disabled={loadingPolicies}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPolicies ? "Loading policies..." : policies.length ? "Select an insurance policy" : "No policies uploaded yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.insurer_name} — {p.policy_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingPolicyData && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading policy JSON...
                  </p>
                )}
              </Field>
              <Field label="Disease / Procedure">
                <div className="relative">
                  <Activity className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Eg. Cardiac Bypass (CABG)"
                    value={procedure}
                    onChange={(e) => { setProcedure(e.target.value); setShowSuggest(true); }}
                    onFocus={() => setShowSuggest(true)}
                    onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                  />
                  {showSuggest && suggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setProcedure(s.procedure_name); setShowSuggest(false); }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span>
                            <span className="font-medium">{s.procedure_name}</span>
                            {s.short_name && <span className="ml-1 text-xs text-muted-foreground">({s.short_name})</span>}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">{s.procedure_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Disease (autocomplete)">
                <div className="relative">
                  <Activity className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Eg. Type 2 Diabetes"
                    value={disease}
                    onChange={(e) => { setDisease(e.target.value); setShowDiseaseSuggest(true); }}
                    onFocus={() => setShowDiseaseSuggest(true)}
                    onBlur={() => setTimeout(() => setShowDiseaseSuggest(false), 150)}
                  />
                  {showDiseaseSuggest && diseaseSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
                      {diseaseSuggestions.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setDisease(d.disease_name); setShowDiseaseSuggest(false); }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span>
                            <span className="font-medium">{d.disease_name}</span>
                            {d.icd10_code && <span className="ml-1 text-xs text-muted-foreground">ICD-10 {d.icd10_code}</span>}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">{d.disease_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="State">
                <Select defaultValue="mh">
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {["MH", "DL", "KA", "TN", "UP", "WB", "GJ", "RJ", "KL"].map((s) => (
                      <SelectItem key={s} value={s.toLowerCase()}>{stateName(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Hospital Name">
                <div className="relative">
                  <Hospital className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" value={hospital} onChange={(e) => setHospital(e.target.value)} />
                </div>
              </Field>
            </div>
            <div className="mt-5">
              <Field label="Clinical notes (optional)">
                <Textarea rows={3} placeholder="Brief diagnosis or notes for the AI to consider..." defaultValue="Patient referred from cardiology dept., admitted with chest pain & elevated troponin. Pre-op completed." />
              </Field>
            </div>
          </Card>

          <Card className="border-border/60 p-6 shadow-card">
            <SectionHeader icon={Upload} title="Upload Insurance Documents" subtitle="Insurance card, ID proof, prior reports" />
            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-smooth hover:border-primary/50 hover:bg-primary/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium">Drop files here, or click to browse</div>
              <div className="text-xs text-muted-foreground">PNG, JPG, PDF up to 10 MB each</div>
              <input type="file" multiple className="hidden" />
            </label>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-secondary/30 bg-secondary/5 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
                <ScanLine className="h-4 w-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-foreground">Document AI · OCR</div>
                <p className="mt-0.5 text-muted-foreground">
                  SEHAT AI automatically extracts policy number, validity, sum insured and exclusions from uploaded insurance documents.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["ayushman_card.pdf", "aadhaar.pdf", "discharge_summary.pdf"].map((f) => (
                <div key={f} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                  <FileCheck2 className="h-3 w-3 text-success" /> {f}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-20 overflow-hidden border-primary/20 bg-gradient-hero p-6 text-white shadow-elegant">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3 w-3" /> AI co-pilot
            </div>
            <h3 className="mt-4 font-display text-xl font-bold leading-snug">
              Instant eligibility, in under 15 seconds.
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Our SEHAT AI Engine cross-references your patient against <strong>1800+ insurance and Ayushman policy frameworks</strong> — checking coverage, exclusions, package rates &amp; documentation.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Policy validity check", "Package & disease mapping", "Document completeness", "Approval probability"].map((x) => (
                <li key={x} className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-secondary" /> {x}</li>
              ))}
            </ul>
            <Button
              type="submit"
              disabled={processing}
              className="mt-6 h-12 w-full bg-white text-primary hover:bg-white/90 shadow-glow animate-pulse-glow"
            >
              {processing ? "Verifying..." : "Verify Eligibility"}
              <Sparkles className="ml-1.5 h-4 w-4" />
            </Button>
            <p className="mt-3 text-center text-[11px] text-white/70">
              <MapPin className="mr-1 inline h-3 w-3" /> IRDAI aligned · NHA compliant · PM-JAY ready
            </p>
          </Card>
        </div>
      </form>
      {processing && <AIProcessingOverlay onDone={() => navigate({ to: "/result" })} />}
    </AppShell>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function stateName(code: string) {
  const m: Record<string, string> = {
    MH: "Maharashtra", DL: "Delhi", KA: "Karnataka", TN: "Tamil Nadu",
    UP: "Uttar Pradesh", WB: "West Bengal", GJ: "Gujarat", RJ: "Rajasthan", KL: "Kerala",
  };
  return m[code];
}
