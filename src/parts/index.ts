// Staging entry: not exported by the package until all retained templates have
// independently verified assemblies made only from these constrained parts.
export {mountParts, type Part, type MountedParts, type MountPartsOptions} from './ownership.js';
export {createTerminalPart,type TerminalPart,type TerminalPartOptions,type TerminalPartState} from './terminal.js';
export {createWebPreviewPart,type WebPreviewPart,type WebPreviewPartState,type WebPreviewBounds} from './web-preview.js';
export {createButtonPart, type ButtonPart, type ButtonPartState, type ButtonPartOptions, type ButtonVariant} from './button.js';
export {createTextPart, createIconPart, type TextPart, type TextPartState, type TextRole, type IconPart, type IconPartState, type IconName} from './text.js';
export {createActionsPart, createFooterPart, createToolbarPart, createStackPart, type LayoutPart, type StackPart, type StackPartState, type ActionsPart, type ActionsPartState, type ToolbarPart, type ToolbarPartState, type ToolbarPurpose} from './layout.js';
export {createInputPart, createTextareaPart, createSelectPart, createChoiceListPart, createFieldLabelPart, createLabelledFieldPart, createCheckboxPart,
  type FieldState, type ValuePart, type InputKind, type Autocomplete, type InputOptions, type TextareaOptions,
  type ChoiceOption, type ChoiceState, type ChoiceOptions, type SelectOptions, type ChoicePart, type FieldLabelState, type FieldLabelPart, type CheckboxOptions, type CheckboxPart} from './fields.js';
export {createFormPart, type FormPart, type FormPartState, type FormPartOptions} from './form.js';
export {createDialogPart, type DialogPart, type DialogPartState, type DialogPartOptions} from './dialog.js';
export {createFeedbackPart, type FeedbackPart, type FeedbackPartState, type FeedbackPartOptions} from './feedback.js';
export {createFieldGroupPart, type FieldGroupPart} from './field-group.js';
export {createMarkdownPart, createPreformattedPart, type MarkdownPartState, type MarkdownPartOptions, type MarkdownPart,
  type PreformattedPartState, type PreformattedPartOptions, type PreformattedPart, type ContentActionResult, type LocalContentLink} from './content.js';
export {createListPart, createListRowPart, type ListPart, type ListPartState, type ListEntry, type ListRowPart, type ListRowPartState} from './collection.js';
export {createPopoverPart, createMenuPart, type FloatingPart, type FloatingPartState, type MenuPart, type MenuPartState, type MenuPartItem} from './floating.js';
export {createTextFlowPart, type TextFlowPart, type TextFlowPartState, type TextFlowSegment, type TextFlowRole} from './text-flow.js';
export {createDisclosurePart, type DisclosurePart, type DisclosurePartState, type DisclosurePartOptions, type DisclosurePurpose} from './disclosure.js';
export {createFieldsetPart, type FieldsetPart, type FieldsetPartState, createFieldGridPart, type FieldGridPart, type FieldGridPartState,
  createInputAdornmentPart, type InputAdornmentPart, type InputAdornmentPartState} from './structure.js';
export {createBadgePart, type BadgePart, type BadgePartState, createStatusPart, type StatusPart, type StatusPartState, type StatusPartOptions} from './status.js';
export {createFormLayoutPart, createSectionPart, createFieldStackPart, createCopyGroupPart, createSeparatedSectionPart, createSectionHeadingPart, type SectionPart, type SectionPartState,
  type FieldStackPart, type FieldStackPartState} from './form-layout.js';
export {createProgressPart, type ProgressPart, type ProgressPartState} from './progress.js';
export {createContentSectionPart, type ContentSectionPart, type ContentSectionPartState, type ContentSectionTone,
  createCardPart, type CardPart, createCardHeadingPart, createGroupedCardPart, type GroupedCardPart, createCardBodyPart, type CardBodyPart,
  createCompactActionsPart, type CompactActionsPart} from './cards.js';
export {createWarningPart} from './warning.js';
export {createSecretLabelPart, type SecretLabelPart, type SecretLabelPartState, type SecretLabelPartOptions} from './secret-label.js';
export {createFramePart, createSideRailPart, createMainPart, createTopbarPart, createRailFooterPart, createRailHeadingPart, createDrawerPart,
  type FramePart, type SideRailPart, type MainPart, type RailHeadingPart, type DrawerPart} from './frame.js';
export {createBrandMarkPart, createBrandPart, type BrandMarkOptions, type BrandMarkPart, type BrandPartState, type BrandPart} from './brand.js';
export {createSearchFieldPart, type SearchFieldPart, type SearchFieldPartState, type SearchFieldPartOptions} from './search.js';
export {createReadingColumnPart, type ReadingColumnPart, createBubblePart, type BubblePart, type BubblePartState, createMessageFooterPart, createMessageActionsPart, createImageGroupPart,
  createReadingNotePart, type ReadingNotePart, createTimestampPart, type TimestampPart, createWorkingIndicatorPart, type WorkingIndicatorPart, type WorkingIndicatorPartState} from './reading.js';
export {createTreePart, type TreePart, type TreePartState, createTreeBranchPart, type TreeBranchPart, type TreeBranchPartState,
  createTreeItemPart, type TreeItemPart, type TreeItemPartState, createActivityPart, type ActivityPart, type ActivityPartState,
  createBreadcrumbPart, type BreadcrumbPart, type BreadcrumbPartState, createConnectionIndicatorPart, type ConnectionIndicatorPart, type ConnectionIndicatorPartState} from './navigation-small.js';
export {createImagePart, createZoomImagePart, type ImageStatus, type ImageData, type ImagePartState, type ImagePartOptions, type ImagePart,
  type ZoomImageState, type ZoomImageStatus, type ZoomImageOptions, type ZoomImagePart} from './image.js';
export {createMediaToolbarPart, type MediaToolbarPart} from './media-toolbar.js';
export {createAnnouncementPart, type AnnouncementPart, type AnnouncementPartState} from './announcement.js';
export {createCopyButtonPart, type CopyButtonPartOptions} from './copy-button.js';
export {createContentViewportPart, type ContentViewportPart, type ContentViewportOptions, type ContentViewportContent, createTrailingActionsPart} from './preview-layout.js';
export {createPaginationPart, type PaginationPart, type PaginationPartState, type PaginationPartOptions} from './pagination.js';
export {createCompoundDisclosurePart, type CompoundDisclosurePart, type CompoundDisclosurePartState, type CompoundDisclosurePartOptions, createDisclosureBodyPart, type DisclosureBodyPurpose} from './compound-disclosure.js';
export {createMetadataPart, type MetadataPart, type MetadataPartState, type MetadataPurpose, createCodePropertyPart, type CodePropertyPart} from './metadata.js';
export {createInlineGroupPart, type InlineGroupPart, type InlineGroupPartState} from './layout.js';
export {createLinkPart, type LinkPart, type LinkPartState, type LinkPartOptions} from './link.js';
export {createCompactSelectPart, type CompactSelectPart, type CompactSelectPartState, type CompactSelectOptions} from './fields.js';
export {createContextNotePart, type ContextNotePart, type ContextNotePartState} from './text.js';
export {createInspectorHeadingPart, createInspectorPart, createAnchoredGroupPart, type InspectorHeadingState, type InspectorHeadingPart, type InspectorPartOptions, type InspectorPart, type AnchoredGroupState, type AnchoredGroupOptions, type AnchoredGroupPart} from './inspector.js';
export {createSelectableCardPart, type SelectableCardPart, type SelectableCardState} from './selectable-card.js';
export {createCalloutPart, type CalloutPart, type CalloutPartState, type CalloutPartOptions} from './cards.js';
export {createOptionActionPart, createOptionGroupPart, createLabelledDividerPart, createSeparatedGroupPart, type OptionActionState, type OptionActionOptions, type OptionActionPart, type OptionGroupPart, type LabelledDividerPart} from './options.js';
export {createScrollListPart, type ScrollListPart, createCompactRowPart, createCompactRowBodyPart, createCompactRowActionsPart, createRowTextPart, type RowTextPart, type RowTextPartState} from './compact-list.js';
export type {BadgePartOptions} from './status.js';
export {createReadingViewportPart, type ReadingSearchState, type ReadingViewportOptions, type ReadingViewportPart} from './reading-viewport.js';
export {createSearchToolbarPart, createReadingRegionPart, type SearchToolbarPartState, type SearchToolbarPart} from './reader-layout.js';
export {createCalloutHeadingPart, createCalloutActionsPart} from './cards.js';
export type {StackPartOptions} from './layout.js';
export {createFoldingPart, type FoldingPart, type FoldingPartState, type FoldingPartOptions} from './folding.js';
export type {CodePropertyPartState, CodePropertyPartOptions} from './metadata.js';
export {createCenteredContentPart, createBrandTilePart, createResponsiveLeadPart, createStepActionPart, createStepGroupPart, createContextLinePart, createSuggestionGroupPart, createIconNotePart,
  type CenteredContentState, type CenteredContentPart, type ResponsiveLeadState, type ResponsiveLeadPart, type StepActionState, type StepActionPart, type StepActionOptions,
  type StepGroupState, type StepGroupPart, type SuggestionGroupPart, type IconNoteState, type IconNotePart} from './welcome-parts.js';
export {createMessageInputPart,createFilePickerPart,type MessageInputPart,type MessageInputState,type MessageInputOptions,type MessageSelection,type FilePickerPart} from './message-input.js';
export {createComposerRegionPart,createComposerPanelsPart,createInputToolbarPart,createInputContextPart,createInputActionsPart,type ComposerLayoutOptions} from './composer-layout.js';
export {createThumbnailStripPart,createThumbnailPart,createCaptionPart,type ThumbnailStripState,type ThumbnailStripOptions,type ThumbnailStripPart,type ThumbnailPart,type CaptionPart} from './thumbnail.js';
export {createStatusActionsPart,type StatusActionsPart} from './status-actions.js';
export {createTopbarActionsPart} from './frame.js';
export {createDescriptionListPart,type DescriptionListPart,type DescriptionEntry} from './description-list.js';
export {createScrollAreaPart} from './scroll-area.js';
export type {FileDropData,NativeFileDropData} from './form.js';
export {createDownloadPart,type DownloadPart,type DownloadResult} from './download.js';
export {createTablePart,createTableRowPart,type TablePart,type TableRowPart} from './table.js';
export {createLineBreakPart} from './text.js';
export {createToastStackPart,createToastPart,createToastBodyPart,createEmblemPart} from './toast.js';
