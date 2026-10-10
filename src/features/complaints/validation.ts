export type DocumentType = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';
export interface ComplaintInput {
  fullName: string; docType: DocumentType; docNumber: string; phone: string;
  email: string; address: string; isMinor: boolean; parentName?: string;
  contractedGoodType: 'PRODUCTO' | 'SERVICIO'; claimedAmount: number;
  goodDescription: string; tableNumber?: string; claimType: 'RECLAMO' | 'QUEJA';
  detail: string; consumerRequest: string; declarationAccepted: boolean;
}
export interface ComplaintProvider { bookId: string; name: string; ruc: string; address: string; configured: boolean }
export interface ComplaintReceipt { claimCode: string; createdAt: string; provider: ComplaintProvider }
export type ComplaintErrors = Partial<Record<keyof ComplaintInput, string>>;
export function validateComplaint(raw: unknown): {valid:true;value:ComplaintInput} | {valid:false;errors:ComplaintErrors} {
  const data=(raw && typeof raw==='object' && !Array.isArray(raw) ? raw : {}) as Record<string,unknown>;
  const errors:ComplaintErrors={};
  const text=(field:keyof ComplaintInput,min:number,max:number,label:string)=>{
    const value=typeof data[field]==='string'?(data[field] as string).trim():'';
    if(value.length<min||value.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value))errors[field]=`${label}: completa el campo (máximo ${max} caracteres).`;
    return value;
  };
  const fullName=text('fullName',2,160,'Nombres y apellidos');
  const docNumber=text('docNumber',1,20,'Documento');
  const docType=data.docType as DocumentType;
  if(!['DNI','RUC','CE','PASAPORTE'].includes(docType))errors.docType='Selecciona un tipo de documento válido.';
  if(docType==='DNI'&&!/^\d{8}$/.test(docNumber))errors.docNumber='El DNI debe contener exactamente 8 dígitos.';
  if(docType==='RUC'&&!/^\d{11}$/.test(docNumber))errors.docNumber='El RUC debe contener exactamente 11 dígitos.';
  if(docType==='CE'&&!/^[a-z0-9]{6,12}$/i.test(docNumber))errors.docNumber='El carné de extranjería debe tener de 6 a 12 caracteres alfanuméricos.';
  if(docType==='PASAPORTE'&&!/^[a-z0-9]{6,20}$/i.test(docNumber))errors.docNumber='El pasaporte debe tener de 6 a 20 caracteres alfanuméricos.';
  const email=text('email',3,254,'Correo electrónico').toLowerCase();
  if(!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)||email.startsWith('.')||email.includes('..'))errors.email='Ingresa un correo válido, por ejemplo nombre@dominio.com.';
  const phone=text('phone',7,25,'Teléfono');
  if(!/^[+\d() .-]+$/.test(phone)||phone.replace(/\D/g,'').length<7)errors.phone='Ingresa un teléfono válido con al menos 7 dígitos.';
  const address=text('address',5,300,'Dirección');
  if(typeof data.isMinor!=='boolean')errors.isMinor='Indica si el consumidor es menor de edad.';
  const isMinor=data.isMinor===true;
  const parentName=isMinor?text('parentName',2,160,'Nombre del representante'):undefined;
  const goodDescription=text('goodDescription',2,1000,'Descripción del bien o servicio');
  const detail=text('detail',5,5000,'Detalle del reclamo');
  const consumerRequest=text('consumerRequest',2,3000,'Pedido del consumidor');
  const claimedAmount=data.claimedAmount;
  if(typeof claimedAmount!=='number'||!Number.isFinite(claimedAmount)||claimedAmount<0||claimedAmount>99999999.99)errors.claimedAmount='El monto debe ser un número válido, desde cero hasta S/ 99 999 999.99.';
  const contractedGoodType=data.contractedGoodType as ComplaintInput['contractedGoodType'];
  const claimType=data.claimType as ComplaintInput['claimType'];
  if(!['PRODUCTO','SERVICIO'].includes(contractedGoodType))errors.contractedGoodType='Selecciona producto o servicio.';
  if(!['RECLAMO','QUEJA'].includes(claimType))errors.claimType='Selecciona reclamo o queja.';
  if(data.declarationAccepted!==true)errors.declarationAccepted='Confirma que los datos ingresados son verídicos.';
  const tableNumber=typeof data.tableNumber==='string'?data.tableNumber.trim():undefined;
  if(tableNumber && tableNumber.length>80)errors.tableNumber='La mesa no debe superar 80 caracteres.';
  if(Object.keys(errors).length)return {valid:false,errors};
  return {valid:true,value:{fullName,docType,docNumber,phone,email,address,isMinor,parentName,goodDescription,detail,consumerRequest,
    claimedAmount:Math.round((claimedAmount as number)*100)/100,contractedGoodType,claimType,tableNumber,declarationAccepted:true}};
}
