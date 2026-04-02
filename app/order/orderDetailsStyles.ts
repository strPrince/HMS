import { StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textStrong,
    flex: 1
  },
  subTitle: {
    fontSize: 13,
    color: colors.mutedDark,
    marginBottom: 14
  },
  notFound: {
    fontSize: 16,
    color: colors.mutedDark,
    padding: 16
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  infoCell: {
    width: '50%',
    paddingVertical: 10
  },
  infoLabel: {
    fontSize: 10,
    color: colors.mutedDark,
    letterSpacing: 0.6
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong,
    marginTop: 4
  },
  timerValue: {
    color: colors.danger
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  statusTitle: {
    fontSize: 11,
    color: colors.mutedDark,
    letterSpacing: 0.6,
    marginBottom: 10
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginTop: 6
  },
  statusDotActive: {
    backgroundColor: colors.success
  },
  statusContent: {
    flex: 1
  },
  statusTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success
  },
  statusTextPrimaryMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textStrong
  },
  statusTextSecondary: {
    fontSize: 11,
    color: colors.mutedDark,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 10
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6
  },
  itemAccent: {
    width: 4,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.success
  },
  itemLineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  totalLabel: {
    fontSize: 13,
    color: colors.mutedDark
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong
  },
  totalLabelStrong: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textStrong
  },
  totalValueStrong: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary
  },
  addButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center'
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedDark
  },
  statusButtonTextActive: {
    color: colors.surface
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedDark
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notesSection: {
    marginBottom: 16
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.textStrong,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  notesText: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.textStrong
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.danger,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger
  },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center'
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface
  },
  completeBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.success,
    paddingVertical: 14,
    alignItems: 'center'
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface
  },
  deliveredBtn: {
    borderRadius: 14,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveredBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  billSummarySection: {
    marginTop: 8,
  },
  billSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  billSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textStrong,
    textAlign: 'center',
  },
  billSummarySubtext: {
    fontSize: 12,
    color: colors.mutedDark,
    textAlign: 'center',
    marginTop: 4,
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billItemName: {
    fontSize: 14,
    color: colors.textStrong,
    flex: 1,
  },
  billItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  billTotalLabel: {
    fontSize: 13,
    color: colors.mutedDark,
  },
  billTotalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textStrong,
  },
  billGrandLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong,
  },
  billGrandValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  sendToManagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
  },
  sendToManagerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  backToTablesBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  backToTablesBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedDark,
  },
});
