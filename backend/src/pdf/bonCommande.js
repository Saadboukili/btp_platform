const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

function formatMontant(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(n || 0)
    .replace(/[\u00A0\u202F]/g, ' ') + ' MAD'; // remplace les espaces insecables (non geres par la police PDF standard)
}

async function embedImageIfExists(pdfDoc, urlPath) {
  if (!urlPath) return null;
  const filePath = path.join(__dirname, '../../', urlPath.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) return null;
  try {
    const bytes = fs.readFileSync(filePath);
    if (filePath.toLowerCase().endsWith('.png')) return await pdfDoc.embedPng(bytes);
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

async function genererPdfBonCommande(bc, entreprise) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marge = 45;
  let y = height - 50;

  const inkColor = rgb(0.08, 0.09, 0.11);
  const mutedColor = rgb(0.54, 0.56, 0.61);
  const accentColor = rgb(0.17, 0.29, 0.45);
  const borderColor = rgb(0.9, 0.91, 0.92);

  const draw = (text, x, yPos, opts = {}) => {
    page.drawText(String(text ?? ''), {
      x, y: yPos,
      size: opts.size || 10,
      font: opts.bold ? fontBold : font,
      color: opts.color || inkColor,
    });
  };

  // ===== En-tete entreprise =====
  const logo = await embedImageIfExists(pdfDoc, entreprise.logo_url);
  if (logo) {
    const logoDims = logo.scale(28 / logo.height);
    page.drawImage(logo, { x: marge, y: y - 20, width: logoDims.width, height: 28 });
    draw(entreprise.nom || 'Entreprise', marge + logoDims.width + 10, y - 5, { bold: true, size: 14 });
  } else {
    draw(entreprise.nom || 'Entreprise', marge, y - 5, { bold: true, size: 14 });
  }
  draw(entreprise.adresse || '', marge, y - 22, { size: 8.5, color: mutedColor });
  draw(`${entreprise.telephone || ''}  ${entreprise.email ? '· ' + entreprise.email : ''}`, marge, y - 34, { size: 8.5, color: mutedColor });
  if (entreprise.ice) draw(`ICE : ${entreprise.ice}`, marge, y - 46, { size: 8.5, color: mutedColor });

  // Titre document a droite
  draw('BON DE COMMANDE', width - marge - 170, y - 5, { bold: true, size: 14, color: accentColor });
  draw(bc.reference, width - marge - 170, y - 22, { size: 10 });
  draw(`Date : ${String(bc.date_emission).slice(0, 10)}`, width - marge - 170, y - 36, { size: 9, color: mutedColor });

  y -= 75;
  page.drawLine({ start: { x: marge, y }, end: { x: width - marge, y }, thickness: 1, color: borderColor });
  y -= 25;

  // ===== Fournisseur =====
  draw('FOURNISSEUR', marge, y, { bold: true, size: 9, color: mutedColor });
  y -= 15;
  draw(bc.fournisseur_nom || 'A confirmer', marge, y, { bold: true, size: 11 });
  y -= 14;
  if (bc.fournisseur_telephone) { draw(bc.fournisseur_telephone, marge, y, { size: 9, color: mutedColor }); y -= 12; }
  if (bc.fournisseur_email) { draw(bc.fournisseur_email, marge, y, { size: 9, color: mutedColor }); y -= 12; }

  y -= 15;

  // ===== Conditions financieres =====
  const conditions = [];
  if (bc.rabais_pct) conditions.push(`Rabais : ${bc.rabais_pct}%`);
  if (bc.avance_pct) conditions.push(`Avance : ${bc.avance_pct}%`);
  if (bc.retenue_pct) conditions.push(`Retenue : ${bc.retenue_pct}%`);
  if (bc.delai_paiement_jours) conditions.push(`Delai de paiement : ${bc.delai_paiement_jours} jours`);
  if (conditions.length > 0) {
    draw(conditions.join('   |   '), marge, y, { size: 8.5, color: mutedColor });
    y -= 20;
  }

  // ===== Tableau des lignes =====
  const colX = { designation: marge, unite: marge + 260, quantite: marge + 320, pu: marge + 390, montant: marge + 470 };
  page.drawRectangle({ x: marge, y: y - 18, width: width - marge * 2, height: 22, color: rgb(0.96, 0.96, 0.97) });
  draw('Designation', colX.designation + 6, y - 12, { bold: true, size: 8.5 });
  draw('Unite', colX.unite, y - 12, { bold: true, size: 8.5 });
  draw('Qte', colX.quantite, y - 12, { bold: true, size: 8.5 });
  draw('P.U.', colX.pu, y - 12, { bold: true, size: 8.5 });
  draw('Montant', colX.montant, y - 12, { bold: true, size: 8.5 });
  y -= 30;

  let montantTotal = 0;
  for (const l of bc.lignes) {
    const montantLigne = l.quantite * l.prix_unitaire;
    montantTotal += montantLigne;
    draw(l.designation, colX.designation + 6, y, { size: 9 });
    draw(l.unite, colX.unite, y, { size: 9 });
    draw(String(l.quantite), colX.quantite, y, { size: 9 });
    draw(formatMontant(l.prix_unitaire), colX.pu, y, { size: 9 });
    draw(formatMontant(montantLigne), colX.montant, y, { size: 9 });
    y -= 18;
    page.drawLine({ start: { x: marge, y: y + 6 }, end: { x: width - marge, y: y + 6 }, thickness: 0.5, color: borderColor });
    if (y < 220) break; // securite basique anti-debordement pour une commande tres longue
  }

  y -= 10;
  page.drawLine({ start: { x: colX.montant - 10, y: y + 14 }, end: { x: width - marge, y: y + 14 }, thickness: 1, color: inkColor });
  draw('TOTAL', colX.pu, y, { bold: true, size: 10 });
  draw(formatMontant(montantTotal), colX.montant, y, { bold: true, size: 10 });

  // ===== Signature / cachet =====
  const zoneSignatureY = 130;
  draw('Bon pour commande', width - marge - 170, zoneSignatureY + 60, { size: 9, color: mutedColor });

  if (bc.signature_appliquee) {
    const cachet = await embedImageIfExists(pdfDoc, entreprise.cachet_url);
    const signature = await embedImageIfExists(pdfDoc, entreprise.signature_url);
    if (cachet) {
      const dims = cachet.scale(70 / cachet.height);
      page.drawImage(cachet, { x: width - marge - 180, y: zoneSignatureY - 15, width: dims.width, height: 70 });
    }
    if (signature) {
      const dims = signature.scale(40 / signature.height);
      page.drawImage(signature, { x: width - marge - 90, y: zoneSignatureY, width: dims.width, height: 40 });
    }
    if (!cachet && !signature) {
      page.drawRectangle({ x: width - marge - 170, y: zoneSignatureY - 10, width: 170, height: 60, borderColor, borderWidth: 1 });
      draw('Cachet et signature', width - marge - 155, zoneSignatureY + 15, { size: 8, color: mutedColor });
    }
    draw(entreprise.directeur_nom || 'Direction', width - marge - 170, zoneSignatureY - 20, { size: 8, color: mutedColor });
  } else {
    page.drawRectangle({ x: width - marge - 170, y: zoneSignatureY - 10, width: 170, height: 60, borderColor, borderWidth: 1 });
    draw('En attente de signature', width - marge - 158, zoneSignatureY + 15, { size: 8, color: mutedColor });
  }

  // ===== Pied de page =====
  draw('Document genere par Chantier — plateforme de gestion de projets BTP', marge, 30, { size: 7, color: mutedColor });

  return pdfDoc.save();
}

module.exports = { genererPdfBonCommande };
